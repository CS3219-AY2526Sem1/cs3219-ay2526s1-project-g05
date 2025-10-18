import { Trash2, Camera, Mail, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MainLayout from "@/layout/MainLayout";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const profile = useProfile();
  if (!profile.user) return null;

  const {
    user,
    userInitials,
    isEditingProfile,
    editFormData,
    editFieldErrors,
    isSaving,
    isDeleteDialogOpen,
    deletePassword,
    deleteError,
    isDeleting,

    setIsEditingProfile,
    handleEditInputChange,
    handleSaveChanges: saveChanges,
    handleCancelEdit: cancelEdit,
    openDeleteDialog,
    handleDeleteAccount: deleteAccount,
    setDeletePassword,
    setIsDeleteDialogOpen,
  } = profile;

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {/* Header Card */}
        <Card>
          <CardContent className="p-6 mt-5 flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src="https://bundui-images.netlify.app/avatars/08.png"
                  alt="Profile"
                />
                <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="outline"
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full"
              >
                <Camera />
              </Button>
            </div>

            <div className="flex-1 space-y-2 md:pl-6">
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Mail className="size-4" />
                  {user.email}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="size-4" />
                  Joined{" "}
                  {new Date(user.createdAt || Date.now()).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isEditingProfile && (
                <Button variant="outline" onClick={() => setIsEditingProfile(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your username, email, or password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {editFieldErrors.general && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {editFieldErrors.general}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editFormData.username}
                  onChange={handleEditInputChange}
                  disabled={!isEditingProfile || isSaving}
                  className={editFieldErrors.username ? "border-destructive" : ""}
                />
                {editFieldErrors.username && (
                  <p className="text-xs text-destructive">{editFieldErrors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleEditInputChange}
                  disabled={!isEditingProfile || isSaving}
                  className={editFieldErrors.email ? "border-destructive" : ""}
                />
                {editFieldErrors.email && (
                  <p className="text-xs text-destructive">{editFieldErrors.email}</p>
                )}
              </div>
            </div>

            {isEditingProfile && (
              <div className="space-y-6 border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={editFormData.currentPassword}
                    onChange={handleEditInputChange}
                    disabled={isSaving}
                    className={editFieldErrors.currentPassword ? "border-destructive" : ""}
                  />
                  {editFieldErrors.currentPassword && (
                    <p className="text-xs text-destructive">{editFieldErrors.currentPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password (optional)</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={editFormData.newPassword}
                    onChange={handleEditInputChange}
                    disabled={isSaving}
                    className={editFieldErrors.newPassword ? "border-destructive" : ""}
                  />
                  {editFieldErrors.newPassword && (
                    <p className="text-xs text-destructive">{editFieldErrors.newPassword}</p>
                  )}
                </div>
              </div>
            )}

            {isEditingProfile && (
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
                  Cancel
                </Button>
                <Button variant="default" onClick={saveChanges} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Delete Account</Label>
                <p className="text-muted-foreground text-sm">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" onClick={openDeleteDialog}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. It will permanently delete your account and all data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Confirm your password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  deleteError && setDeletePassword("");
                }}
                disabled={isDeleting}
                className={deleteError ? "border-destructive" : ""}
              />
              {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
            </div>

            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">
                Warning: You are about to delete your account
              </p>
              <ul className="mt-2 text-xs text-destructive/80 list-disc list-inside space-y-1">
                <li>All your personal information will be removed</li>
                <li>Your progress and history will be lost</li>
                <li>This action cannot be reversed</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
