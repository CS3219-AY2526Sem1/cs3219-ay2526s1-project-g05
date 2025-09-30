import { useState } from "react";
import { Trash2, Camera, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MainLayout from "@/layout/MainLayout";

export default function ProfilePage() {
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        {/* Header */}
        <Card>
          <CardContent className="p-6 mt-5">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src="https://bundui-images.netlify.app/avatars/08.png"
                    alt="Profile"
                  />
                  <AvatarFallback className="text-2xl">JD</AvatarFallback>
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
                <h1 className="text-2xl font-bold">John Doe</h1>
                <div className="text-muted-foreground flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Mail className="size-4" />
                    john.doe@example.com
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="size-4" />
                    Joined March 2023
                  </div>
                </div>
              </div>

              {!isEditingProfile && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Content */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your username, email, or password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  defaultValue="JohnDoe"
                  readOnly={!isEditingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="john.doe@example.com"
                  readOnly={!isEditingProfile}
                />
              </div>
            </div>

            {isEditingProfile && (
              <div className="space-y-4">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>
            )}

            {isEditingProfile && (
              <div className="flex justify-end mt-6">
                <Button variant="default" onClick={() => setIsEditingProfile(false)}>
                  Save Changes
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
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
