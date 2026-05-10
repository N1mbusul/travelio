from decimal import Decimal

from rest_framework import serializers

from listings.models import Property, Room

from .models import Booking


class BookingCreateSerializer(serializers.Serializer):
    """Accepts frontend payload; persists a Booking linked to a Room on the property."""

    property = serializers.PrimaryKeyRelatedField(queryset=Property.objects.all())
    check_in = serializers.DateField()
    check_out = serializers.DateField()
    number_of_guests = serializers.IntegerField(min_value=1)
    number_of_days = serializers.IntegerField(required=False, min_value=1)

    def validate(self, data):
        prop = data["property"]
        check_in = data["check_in"]
        check_out = data["check_out"]

        if check_out <= check_in:
            raise serializers.ValidationError(
                {"check_out": "Check-out must be after check-in."}
            )

        nights = (check_out - check_in).days
        if nights <= 0:
            raise serializers.ValidationError("Stay must be at least one night.")

        if data.get("number_of_days") is not None and data["number_of_days"] != nights:
            raise serializers.ValidationError(
                {"number_of_days": "Does not match the selected check-in and check-out dates."}
            )

        if data["number_of_guests"] > prop.capacity:
            raise serializers.ValidationError(
                f"This property accepts at most {prop.capacity} guest(s)."
            )

        rooms = Room.objects.filter(property=prop).order_by("price_per_night", "id")
        if not rooms.exists():
            raise serializers.ValidationError(
                "This property has no rooms configured yet; booking is unavailable."
            )

        for room in rooms:
            if data["number_of_guests"] > room.capacity:
                continue
            overlap = Booking.objects.filter(
                room=room,
                check_in_date__lt=check_out,
                check_out_date__gt=check_in,
            ).exists()
            if not overlap:
                data["_room"] = room
                data["_nights"] = nights
                return data

        raise serializers.ValidationError(
            "No room is available for the selected dates (or guest count exceeds room capacity)."
        )

    def create(self, validated_data):
        room = validated_data.pop("_room")
        nights = validated_data.pop("_nights")
        validated_data.pop("property")
        check_in = validated_data.pop("check_in")
        check_out = validated_data.pop("check_out")
        validated_data.pop("number_of_guests", None)
        validated_data.pop("number_of_days", None)

        total_price = Decimal(nights) * room.price_per_night

        return Booking.objects.create(
            user=self.context["request"].user,
            room=room,
            check_in_date=check_in,
            check_out_date=check_out,
            total_price=total_price,
        )


class BookingListSerializer(serializers.ModelSerializer):
    """Shape expected by the profile page."""

    property_name = serializers.CharField(source="room.property.name", read_only=True)
    start_date = serializers.DateField(source="check_in_date", read_only=True)
    end_date = serializers.DateField(source="check_out_date", read_only=True)
    status = serializers.CharField(source="booking_status", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "property_name",
            "start_date",
            "end_date",
            "total_price",
            "status",
            "checked_in_at",
            "checked_out_at",
        ]


class ReceptionBookingSerializer(serializers.ModelSerializer):
    """Bookings for the receptionist dashboard."""

    property_name = serializers.CharField(source="room.property.name", read_only=True)
    room_label = serializers.CharField(source="room.room_type", read_only=True)
    guest_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "property_name",
            "room_label",
            "guest_username",
            "check_in_date",
            "check_out_date",
            "total_price",
            "booking_status",
            "checked_in_at",
            "checked_out_at",
        ]
