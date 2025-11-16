import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { userApi } from "@/lib/api";
import { useUserContext } from "@/context/UserContext";

export function useProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useUserContext();

  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [editFieldErrors, setEditFieldErrors] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    general: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete account states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    setEditFormData({
      username: user.username,
      email: user.email,
      currentPassword: "",
      newPassword: "",
    });
  }, [user, navigate, setUser]);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Password is required to delete your account.");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      await userApi.delete(deletePassword);

      localStorage.removeItem("token");
      window.dispatchEvent(new Event("userLoggedOut"));

      toast.success("Account deleted successfully.");
      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);
      setDeleteError(
        error.message || "Unable to delete account. Please try again later.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { id, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [id]: value }));
    setEditFieldErrors((prev) => ({ ...prev, [id]: "", general: "" }));
  };

  const parseEditErrors = (errors) => {
    const fieldErrs = {
      username: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      general: "",
    };

    if (Array.isArray(errors)) {
      errors.forEach((error) => {
        const errorLower = error.toLowerCase();
        if (errorLower.includes("username")) fieldErrs.username = error;
        else if (errorLower.includes("email")) fieldErrs.email = error;
        else if (errorLower.includes("password")) {
          if (errorLower.includes("current")) fieldErrs.currentPassword = error;
          else fieldErrs.newPassword = error;
        } else fieldErrs.general = error;
      });
    } else if (typeof errors === "string") {
      fieldErrs.general = errors;
    }

    return fieldErrs;
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setEditFieldErrors({
      username: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      general: "",
    });

    try {
      const updates = {};

      if (editFormData.username !== user.username)
        updates.username = editFormData.username;
      if (editFormData.email !== user.email) updates.email = editFormData.email;

      if (editFormData.newPassword) {
        if (!editFormData.currentPassword) {
          setEditFieldErrors((prev) => ({
            ...prev,
            currentPassword:
              "Current password is required to set a new password.",
          }));
          setIsSaving(false);
          return;
        }

        try {
          await userApi.login({
            email: user.email,
            password: editFormData.currentPassword,
          });
        } catch {
          setEditFieldErrors((prev) => ({
            ...prev,
            currentPassword: "Current password is incorrect.",
          }));
          setIsSaving(false);
          return;
        }

        updates.password = editFormData.newPassword;
      }

      if (Object.keys(updates).length === 0) {
        setEditFieldErrors((prev) => ({
          ...prev,
          general: "No changes detected.",
        }));
        setIsSaving(false);
        return;
      }

      const response = await userApi.update(updates);
      const updatedUser = { ...user, ...response.user };
      setUser(updatedUser);

      setEditFormData({
        username: updatedUser.username,
        email: updatedUser.email,
        currentPassword: "",
        newPassword: "",
      });

      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Update profile error:", error);
      if (error.errors && Array.isArray(error.errors))
        setEditFieldErrors(parseEditErrors(error.errors));
      else setEditFieldErrors(parseEditErrors([error.message]));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditFormData({
      username: user.username,
      email: user.email,
      currentPassword: "",
      newPassword: "",
    });
    setEditFieldErrors({
      username: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      general: "",
    });
    setIsEditingProfile(false);
  };

  const openDeleteDialog = () => {
    setDeletePassword("");
    setDeleteError("");
    setIsDeleteDialogOpen(true);
  };

  return {
    user,
    isEditingProfile,
    editFormData,
    editFieldErrors,
    isSaving,
    isDeleteDialogOpen,
    deletePassword,
    deleteError,
    isDeleting,
    userInitials: user?.username
      ? user.username.substring(0, 2).toUpperCase()
      : "U",

    setIsEditingProfile,
    handleEditInputChange,
    handleSaveChanges,
    handleCancelEdit,
    openDeleteDialog,
    handleDeleteAccount,
    setDeletePassword,
    setIsDeleteDialogOpen,
  };
}
