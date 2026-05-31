import type { ChangeEvent } from "react";
import { USERS } from "../data/mockData";

type Props = {
  userId: number;
  onChange: (id: number) => void;
};

export default function UserSelect({ userId, onChange }: Props) {
  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    onChange(Number(e.target.value));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        User
      </label>
      <select
        value={userId}
        onChange={handleChange}
        className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      >
        {USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} (id: {u.id})
          </option>
        ))}
      </select>
    </div>
  );
}
