from rest_framework import permissions

class IsClient(permissions.BasePermission):
    
    #Permission permettant l'accès uniquement aux utilisateurs ayant le rôle 'client'.
    
    def has_permission(self, request, view):
        # vérifier si l'utilisateur est connecté et si son rôle est 'client'
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'client'
        )

class IsAdminRole(permissions.BasePermission):
    """
    Permission permettant l'accès uniquement aux utilisateurs ayant le rôle 'admin'.
    """
    def has_permission(self, request, view):
        # vérifier si l'utilisateur est connecté et si son rôle est 'admin'
        return bool(
            request.user and 
            request.user.is_authenticated and 
            getattr(request.user, 'role', None) == 'admin'
        )