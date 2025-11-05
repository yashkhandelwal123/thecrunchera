import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface TrustBadgeProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function TrustBadge({ icon: Icon, title, description }: TrustBadgeProps) {
  return (
    <Card className="p-6 text-center hover-elevate">
      <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-accent-foreground" />
      </div>
      <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
}
