from rest_framework import serializers
from .models import Property, PropertyImage, Room


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = [
            "id",
            "property",
            "room_type",
            "capacity",
            "price_per_night",
            "availability_status",
            "description",
            "created_at",
        ]
        read_only_fields = ["property", "created_at"]


class PropertyImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'image_url']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        url = obj.image.url
        if request:
            return request.build_absolute_uri(url)
        return url


class PropertySerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source='owner.username')
    images = PropertyImageSerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = [
            'id',
            'name',
            'address',
            'city',
            'country',
            'description',
            'capacity',
            'property_type',
            'rating_average',
            'owner_username',
            'images',
        ]
        read_only_fields = ['owner', 'rating_average']

    def create(self, validated_data):
        request = self.context.get('request')
        image_files = []
        if request:
            image_files = request.FILES.getlist('uploaded_images')
        property_obj = super().create(validated_data)
        for image_file in image_files:
            PropertyImage.objects.create(property=property_obj, image=image_file)
        return property_obj


class PropertyOwnerSerializer(PropertySerializer):
    """Property + nested rooms for owners managing listings."""

    rooms = RoomSerializer(many=True, read_only=True)

    class Meta(PropertySerializer.Meta):
        fields = PropertySerializer.Meta.fields + ["rooms"]