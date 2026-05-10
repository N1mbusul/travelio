from django.urls import path

from .views import (
    BookingCancelView,
    BookingCheckInView,
    BookingCheckOutView,
    BookingConfirmView,
    BookingCreateView,
    MyBookingListView,
    ReceptionBookingListView,
)

urlpatterns = [
    path("my-bookings/", MyBookingListView.as_view(), name="my-bookings"),
    path("reception/", ReceptionBookingListView.as_view(), name="reception-bookings"),
    path("create/", BookingCreateView.as_view(), name="booking-create"),
    path("<int:pk>/cancel/", BookingCancelView.as_view(), name="booking-cancel"),
    path("<int:pk>/confirm/", BookingConfirmView.as_view(), name="booking-confirm"),
    path("<int:pk>/check-in/", BookingCheckInView.as_view(), name="booking-check-in"),
    path("<int:pk>/check-out/", BookingCheckOutView.as_view(), name="booking-check-out"),
]
