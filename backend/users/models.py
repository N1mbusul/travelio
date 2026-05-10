from django.db import models
from django.contrib.auth.models import AbstractUser

# USER MODEL
class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('client', 'Client'),
        ('owner', 'Owner'),
        ('receptionist', 'Receptionist'),
    ]

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='client'
    )

    # Receptionists work at a single property (assigned by the owner).
    assigned_property = models.ForeignKey(
        "listings.Property",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_receptionists",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.username
