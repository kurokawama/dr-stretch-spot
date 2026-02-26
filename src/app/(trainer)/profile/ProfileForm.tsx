"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

const profileSchema = z.object({
  fullName: z.string().min(1, "氏名は必須です。"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^[0-9+\-() ]{8,20}$/.test(value),
      "電話番号の形式が不正です。"
    ),
  preferredAreas: z.string(),
  preferredTimeSlots: z.string(),
  bio: z.string().max(500, "自己紹介は500文字以内で入力してください。"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialValues: {
    fullName: string;
    phone: string;
    preferredAreas: string[];
    preferredTimeSlots: string[];
    bio: string;
  };
}

function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function ProfileForm({ initialValues }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: initialValues.fullName,
      phone: initialValues.phone,
      preferredAreas: initialValues.preferredAreas.join(", "),
      preferredTimeSlots: initialValues.preferredTimeSlots.join(", "),
      bio: initialValues.bio,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("ログイン情報を確認できませんでした。");
        return;
      }

      const profileUpdate = await supabase
        .from("profiles")
        .update({ display_name: values.fullName })
        .eq("id", user.id);

      if (profileUpdate.error) {
        toast.error(profileUpdate.error.message);
        return;
      }

      const trainerUpdate = await supabase
        .from("alumni_trainers")
        .update({
          full_name: values.fullName,
          phone: values.phone.trim() || null,
          preferred_areas: parseCommaSeparatedList(values.preferredAreas),
          preferred_time_slots: parseCommaSeparatedList(values.preferredTimeSlots),
          bio: values.bio.trim() || null,
        })
        .eq("auth_user_id", user.id);

      if (trainerUpdate.error) {
        toast.error(trainerUpdate.error.message);
        return;
      }

      toast.success("プロフィールを更新しました。");
      router.refresh();
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>氏名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>電話番号</FormLabel>
              <FormControl>
                <Input {...field} placeholder="090-1234-5678" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredAreas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>希望エリア</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: 関東, 関西" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredTimeSlots"
          render={({ field }) => (
            <FormItem>
              <FormLabel>希望時間帯</FormLabel>
              <FormControl>
                <Input {...field} placeholder="例: morning, evening" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>自己紹介</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
      </form>
    </Form>
  );
}
