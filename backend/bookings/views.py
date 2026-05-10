from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    ReceptionBookingSerializer,
)


class MyBookingListView(generics.ListAPIView):
    serializer_class = BookingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Booking.objects.filter(user=self.request.user)
            .select_related("room__property")
            .order_by("-check_in_date")
        )


class ReceptionBookingListView(generics.ListAPIView):
    """All bookings for rooms on the receptionist's assigned property."""

    serializer_class = ReceptionBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != "receptionist" or not user.assigned_property_id:
            return Booking.objects.none()
        return (
            Booking.objects.filter(room__property_id=user.assigned_property_id)
            .select_related("room", "room__property", "user")
            .order_by("-check_in_date")
        )


class BookingCreateView(generics.CreateAPIView):
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(
            {
                "id": booking.id,
                "total_price": str(booking.total_price),
                "booking_status": booking.booking_status,
                "check_in_date": booking.check_in_date,
                "check_out_date": booking.check_out_date,
                "room": booking.room_id,
            },
            status=status.HTTP_201_CREATED,
        )


def _assert_receptionist_for_booking(user, booking):
    if user.role != "receptionist" or not user.assigned_property_id:
        raise PermissionDenied()
    if booking.room.property_id != user.assigned_property_id:
        raise PermissionDenied("This booking is not for your assigned property.")


class BookingConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(
            Booking.objects.select_related("room__property"), pk=pk
        )
        _assert_receptionist_for_booking(request.user, booking)
        if booking.booking_status != "asteptare":
            return Response(
                {"detail": "Only pending bookings can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.booking_status = "confirmata"
        booking.save(update_fields=["booking_status"])
        return Response(ReceptionBookingSerializer(booking).data)


class BookingCheckInView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(
            Booking.objects.select_related("room__property"), pk=pk
        )
        _assert_receptionist_for_booking(request.user, booking)
        if booking.booking_status != "confirmata":
            return Response(
                {"detail": "Only confirmed bookings can be checked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if booking.checked_in_at:
            return Response(
                {"detail": "Guest is already checked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.checked_in_at = timezone.now()
        booking.save(update_fields=["checked_in_at"])
        return Response(ReceptionBookingSerializer(booking).data)


class BookingCheckOutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(
            Booking.objects.select_related("room__property"), pk=pk
        )
        _assert_receptionist_for_booking(request.user, booking)
        if not booking.checked_in_at:
            return Response(
                {"detail": "Check-in must be completed before check-out."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if booking.checked_out_at:
            return Response(
                {"detail": "Guest is already checked out."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.checked_out_at = timezone.now()
        booking.booking_status = "finalizata"
        booking.save(update_fields=["checked_out_at", "booking_status"])
        return Response(ReceptionBookingSerializer(booking).data)


class BookingCancelView(APIView):
    """Guest cancels their own booking before check-in."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        booking = get_object_or_404(Booking.objects.select_related("room"), pk=pk)
        if booking.user_id != request.user.id:
            raise PermissionDenied()
        if booking.checked_in_at:
            return Response(
                {"detail": "Cannot cancel after check-in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if booking.booking_status in ("anulata", "finalizata"):
            return Response(
                {"detail": "This booking is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.booking_status = "anulata"
        booking.save(update_fields=["booking_status"])
        return Response(BookingListSerializer(booking).data)
