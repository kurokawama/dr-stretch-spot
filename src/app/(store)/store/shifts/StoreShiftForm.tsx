"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createShiftRequest } from "@/actions/shifts";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShiftTemplate } from "@/types/database";
import { toast } from "sonner";

const createShiftSchema = z
  .object({
    title: z.string().min(1, "タイトルを入力してください。"),
    shiftDate: z.string().min(1, "日付を入力してください。"),
    startTime: z.string().min(1, "開始時刻を入力してください。"),
    endTime: z.string().min(1, "終了時刻を入力してください。"),
    breakMinutes: z.coerce.number().int().min(0).max(240),
    requiredCount: z.coerce.number().int().min(1).max(20),
    isEmergency: z.boolean(),
    emergencyBonusAmount: z.coerce.number().int().min(0).max(5000),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "終了時刻は開始時刻より後に設定してください。",
    path: ["endTime"],
  });

type CreateShiftFormValues = z.infer<typeof createShiftSchema>;

type TemplateItem = Pick<
  ShiftTemplate,
  "id" | "name" | "title" | "start_time" | "end_time" | "break_minutes" | "required_count"
>;

interface StoreShiftFormProps {
  storeId: string;
  managerId: string;
  initialTemplates: TemplateItem[];
}

export function StoreShiftForm({
  storeId,
  managerId,
  initialTemplates,
}: StoreShiftFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateShiftFormValues>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      title: "",
      shiftDate: "",
      startTime: "09:00",
      endTime: "18:00",
      breakMinutes: 60,
      requiredCount: 1,
      isEmergency: false,
      emergencyBonusAmount: 0,
    },
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );
  const isEmergency = useWatch({
    control: form.control,
    name: "isEmergency",
  });

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    form.setValue("title", template.title);
    form.setValue("startTime", template.start_time.slice(0, 5));
    form.setValue("endTime", template.end_time.slice(0, 5));
    form.setValue("breakMinutes", template.break_minutes);
    form.setValue("requiredCount", template.required_count);
  };

  const saveTemplate = () => {
    const current = form.getValues();
    const templateName = window.prompt("テンプレート名を入力してください。");
    if (!templateName || templateName.trim().length === 0) {
      return;
    }

    startTransition(async () => {
      const { data, error } = await supabase
        .from("shift_templates")
        .insert({
          store_id: storeId,
          created_by: managerId,
          name: templateName.trim(),
          title: current.title,
          description: null,
          start_time: current.startTime,
          end_time: current.endTime,
          break_minutes: current.breakMinutes,
          required_count: current.requiredCount,
          required_certifications: [],
        })
        .select("id, name, title, start_time, end_time, break_minutes, required_count")
        .single();

      if (error) {
        toast.error(error.message);
        return;
      }

      setTemplates((prev) => [data, ...prev]);
      setSelectedTemplateId(data.id);
      toast.success("テンプレートを保存しました。");
    });
  };

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createShiftRequest({
        store_id: storeId,
        title: values.title,
        shift_date: values.shiftDate,
        start_time: values.startTime,
        end_time: values.endTime,
        break_minutes: values.breakMinutes,
        required_count: values.requiredCount,
        is_emergency: values.isEmergency,
        emergency_bonus_amount: values.isEmergency ? values.emergencyBonusAmount : 0,
      });

      if (!result.success) {
        toast.error(result.error ?? "シフト作成に失敗しました。");
        return;
      }

      toast.success("シフト募集を作成しました。");
      form.reset({
        title: selectedTemplate?.title ?? "",
        shiftDate: "",
        startTime: selectedTemplate?.start_time.slice(0, 5) ?? "09:00",
        endTime: selectedTemplate?.end_time.slice(0, 5) ?? "18:00",
        breakMinutes: selectedTemplate?.break_minutes ?? 60,
        requiredCount: selectedTemplate?.required_count ?? 1,
        isEmergency: false,
        emergencyBonusAmount: 0,
      });
      router.refresh();
    });
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Select value={selectedTemplateId} onValueChange={applyTemplate}>
          <SelectTrigger>
            <SelectValue placeholder="テンプレートを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">テンプレートなし</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={saveTemplate}
          disabled={isPending}
        >
          テンプレート保存
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>タイトル</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例: 週末ヘルプ募集" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="shiftDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>日付</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>開始時刻</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>終了時刻</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="breakMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>休憩（分）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiredCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>募集人数</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isEmergency"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
                <FormLabel>緊急募集</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEmergency ? (
            <FormField
              control={form.control}
              name="emergencyBonusAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>緊急ボーナス（時給加算）</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? "作成中..." : "シフトを作成"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
