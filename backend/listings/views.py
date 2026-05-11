from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Property, Room
from .serializers import PropertySerializer, PropertyOwnerSerializer, RoomSerializer

User = get_user_model()


class PropertyListCreateView(generics.ListCreateAPIView):
    queryset = Property.objects.select_related('owner').prefetch_related('images')
    serializer_class = PropertySerializer
    # permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied('You are not authenticated.')
        user = self.request.user
        if user.role != 'owner':
            raise PermissionDenied('Only owners can create properties.')
        serializer.save(owner=self.request.user)

class PropertyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Property.objects.select_related('owner').prefetch_related('images')
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied()
        if serializer.instance.owner_id != self.request.user.id:
            raise PermissionDenied('Only the owner can update this property.')
        serializer.save()

    def perform_destroy(self, instance):
        if not self.request.user.is_authenticated:
            raise PermissionDenied()
        user = self.request.user
        if user.role != "owner" or instance.owner_id != user.id:
            raise PermissionDenied(
                'Only the property owner account can delete this listing.'
            )
        # Free receptionists so they can be assigned to another owner's property.
        User.objects.filter(assigned_property_id=instance.pk).update(
            assigned_property=None
        )
        instance.delete()


class MyPropertyListView(generics.ListAPIView):
    """List properties owned by the current user (owners only)."""

    serializer_class = PropertyOwnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != "owner":
            return Property.objects.none()
        return (
            Property.objects.filter(owner=user)
            .select_related("owner")
            .prefetch_related("images", "rooms")
            .order_by("-updated_at")
        )


class PropertyRoomListCreateView(generics.ListCreateAPIView):
    """List or create rooms for a property (owner of that property only)."""

    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        prop = get_object_or_404(Property, pk=self.kwargs["property_pk"])
        user = self.request.user
        if user.role == "owner" and prop.owner_id == user.id:
            return Room.objects.filter(property=prop).order_by("id")
        if user.role == "receptionist" and user.assigned_property_id == prop.id:
            return Room.objects.filter(property=prop).order_by("id")
        raise PermissionDenied()

    def perform_create(self, serializer):
        prop = get_object_or_404(Property, pk=self.kwargs["property_pk"])
        if prop.owner_id != self.request.user.id:
            raise PermissionDenied()
        if self.request.user.role != "owner":
            raise PermissionDenied("Only owners can add rooms.")
        serializer.save(property=prop)


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Owner: full access. Receptionist (assigned property only): update availability_status only."""

    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "owner":
            return Room.objects.filter(property__owner=user)
        if user.role == "receptionist" and user.assigned_property_id:
            return Room.objects.filter(property_id=user.assigned_property_id)
        return Room.objects.none()

    def perform_update(self, serializer):
        user = self.request.user
        if user.role == "receptionist":
            allowed = {"availability_status"}
            if set(serializer.validated_data.keys()) - allowed:
                raise PermissionDenied(
                    "Receptionists may only change room availability (e.g. maintenance)."
                )
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role != "owner":
            raise PermissionDenied("Only the property owner can delete rooms.")
        if instance.property.owner_id != user.id:
            raise PermissionDenied()
        instance.delete()


class PropertyReceptionistAssignmentView(APIView):
    """
    Owner: GET assigned receptionist, POST assign by username or user_id, DELETE unassign.
    Receptionist: GET basic info when pk is their assigned property.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        prop = get_object_or_404(Property, pk=pk)
        user = request.user
        if user.role == "owner" and prop.owner_id == user.id:
            rec = User.objects.filter(
                assigned_property=prop, role="receptionist"
            ).first()
            return Response(
                {
                    "receptionist": (
                        {"id": rec.id, "username": rec.username} if rec else None
                    )
                }
            )
        if user.role == "receptionist" and user.assigned_property_id == prop.id:
            return Response(
                {
                    "property": {
                        "id": prop.id,
                        "name": prop.name,
                        "city": prop.city,
                        "country": prop.country,
                    }
                }
            )
        raise PermissionDenied()

    def post(self, request, pk):
        prop = get_object_or_404(Property, pk=pk)
        if prop.owner_id != request.user.id or request.user.role != "owner":
            raise PermissionDenied()
        username = request.data.get("username")
        user_id = request.data.get("user_id")
        if user_id is not None:
            rec = get_object_or_404(User, pk=user_id)
        elif username:
            rec = get_object_or_404(User, username=username)
        else:
            return Response(
                {"detail": "Provide username or user_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if rec.role != "receptionist":
            return Response(
                {"detail": "User must have the receptionist role."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing_prop_id = rec.assigned_property_id
        if existing_prop_id is not None and existing_prop_id != prop.id:
            return Response(
                {
                    "detail": (
                        "That receptionist is already assigned to another property. "
                        "Their current employer must remove them before you can "
                        "assign them here—you cannot move them from someone else's "
                        "listing."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        User.objects.filter(assigned_property=prop).exclude(pk=rec.pk).update(
            assigned_property=None
        )
        rec.assigned_property = prop
        rec.save(update_fields=["assigned_property"])
        return Response(
            {"receptionist": {"id": rec.id, "username": rec.username}},
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        prop = get_object_or_404(Property, pk=pk)
        if prop.owner_id != request.user.id or request.user.role != "owner":
            raise PermissionDenied()
        User.objects.filter(assigned_property=prop).update(assigned_property=None)
        return Response(status=status.HTTP_204_NO_CONTENT)
