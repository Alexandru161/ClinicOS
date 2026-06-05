import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionPageProps {
  title: string;
  description: string;
}

export function SectionPage({ title, description }: SectionPageProps) {
  return (
    <Card className="border-white/10 bg-slate-950/60">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-300">
        <p>This section will be available after the clinic administrator enables it for your account.</p>
      </CardContent>
    </Card>
  );
}
