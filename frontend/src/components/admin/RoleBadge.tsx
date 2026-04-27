interface RoleBadgeProps {
  role: string;
}

const roleConfig: Record<string, { bg: string; text: string; label: string }> = {
  user: {
    bg: "bg-[#3b5a9f]/25",
    text: "text-[#7fa3d9]",
    label: "User",
  },
  admin: {
    bg: "bg-[#8b6f47]/25",
    text: "text-[#d8c19a]",
    label: "Admin",
  },
  superadmin: {
    bg: "bg-[#9a4a4a]/25",
    text: "text-[#f4c2c2]",
    label: "Superadmin",
  },
};

export default function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.user;

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
