from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import RegisterSerializer

from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "full_name": getattr(user, "full_name", "") or "",
            "assigned_property": None,
        }
        if user.role == "receptionist" and getattr(user, "assigned_property_id", None):
            prop = user.assigned_property
            data["assigned_property"] = {
                "id": prop.id,
                "name": prop.name,
                "city": prop.city,
                "country": prop.country,
            }
        return Response(data)

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            refresh = RefreshToken.for_user(user)

            return Response({
                "user": serializer.data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            })

        return Response(serializer.errors, status=400)

from django.contrib.auth import authenticate


class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username, password=password)

        if user is None:
            return Response({"error": "Invalid credentials"}, status=400)

        refresh = RefreshToken.for_user(user)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })

