class NotFoundError(Exception):
    """Requested resource was not found."""


class ForbiddenError(Exception):
    """Authenticated user is not authorized for the requested operation."""


class ValidationError(Exception):
    """Domain validation error."""
