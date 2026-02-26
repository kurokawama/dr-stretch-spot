"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { toast } from "sonner";

const filterSchema = z.object({
  area: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  emergencyOnly: z.boolean(),
});

type FilterFormValues = z.infer<typeof filterSchema>;

interface ShiftSearchFiltersProps {
  areas: string[];
  defaultValues: {
    area?: string;
    dateFrom?: string;
    dateTo?: string;
    emergencyOnly: boolean;
  };
}

export function ShiftSearchFilters({
  areas,
  defaultValues,
}: ShiftSearchFiltersProps) {
  const router = useRouter();

  const safeArea = useMemo(() => {
    if (!defaultValues.area) return "all";
    return areas.includes(defaultValues.area) ? defaultValues.area : "all";
  }, [areas, defaultValues.area]);

  const form = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      area: safeArea,
      dateFrom: defaultValues.dateFrom ?? "",
      dateTo: defaultValues.dateTo ?? "",
      emergencyOnly: defaultValues.emergencyOnly,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    if (values.dateFrom && values.dateTo && values.dateFrom > values.dateTo) {
      toast.error("開始日は終了日以前に設定してください。");
      return;
    }

    const params = new URLSearchParams();
    if (values.area && values.area !== "all") {
      params.set("area", values.area);
    }
    if (values.dateFrom) {
      params.set("dateFrom", values.dateFrom);
    }
    if (values.dateTo) {
      params.set("dateTo", values.dateTo);
    }
    if (values.emergencyOnly) {
      params.set("emergency", "1");
    }

    const query = params.toString();
    router.push(query ? `/shifts?${query}` : "/shifts");
    router.refresh();
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>エリア</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="エリアを選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergencyOnly"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <FormLabel>緊急募集のみ</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="緊急募集のみ"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateFrom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>開始日</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>終了日</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full sm:w-auto">
          検索
        </Button>
      </form>
    </Form>
  );
}
