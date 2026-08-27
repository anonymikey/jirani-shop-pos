"use client"

import { useTheme } from "@/components/theme-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function AppearanceSettings() {
  const { mode, accent, setMode, setAccent } = useTheme()
  return <Card>
    <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose how JIRANI looks on this device. Changes apply immediately.</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-5">
      <div className="flex flex-col gap-2"><Label>Theme</Label><ToggleGroup value={[mode]} onValueChange={(values) => values[0] && setMode(values[0] as typeof mode)} className="justify-start"><ToggleGroupItem value="light" aria-label="Use light theme">Light</ToggleGroupItem><ToggleGroupItem value="dark" aria-label="Use dark theme">Dark</ToggleGroupItem><ToggleGroupItem value="system" aria-label="Use system theme">System</ToggleGroupItem></ToggleGroup></div>
      <div className="flex flex-col gap-2"><Label>Accent</Label><ToggleGroup value={[accent]} onValueChange={(values) => values[0] && setAccent(values[0] as typeof accent)} className="justify-start"><ToggleGroupItem value="emerald" aria-label="Use emerald accent">Emerald</ToggleGroupItem><ToggleGroupItem value="blue" aria-label="Use blue accent">Blue</ToggleGroupItem><ToggleGroupItem value="amber" aria-label="Use amber accent">Amber</ToggleGroupItem></ToggleGroup></div>
    </CardContent>
  </Card>
}
