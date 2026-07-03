"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeeStatus, setCommissionStatus } from "@/app/admin/finance-actions";

const SELECT_CLS =
  "rounded-md border border-border-warm bg-paper px-2 py-1 text-xs text-ink outline-none";

export function FeeStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setFeeStatus(id, e.target.value);
          router.refresh();
        })
      }
      className={SELECT_CLS}
    >
      {["unpaid", "partial", "paid", "waived"].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function CommissionStatusSelect({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await setCommissionStatus(id, e.target.value);
          router.refresh();
        })
      }
      className={SELECT_CLS}
    >
      {["accrued", "invoiced", "paid"].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
