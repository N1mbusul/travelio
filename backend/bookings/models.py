from django.conf import settings
from django.db import models

# BOOKING MODEL

class Booking(models.Model):
    BOOKING_STATUS_CHOICES = [
        ('asteptare', 'In asteptare'),
        ('confirmata', 'Confirmata'),
        ('anulata', 'Anulata'),
        ('finalizata', 'Finalizata'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    room = models.ForeignKey(
        'listings.Room',
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    check_in_date = models.DateField()
    check_out_date = models.DateField()

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    booking_status = models.CharField(
        max_length=20,
        choices=BOOKING_STATUS_CHOICES,
        default='asteptare'
    )

    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking #{self.id} - {self.user.email}"


