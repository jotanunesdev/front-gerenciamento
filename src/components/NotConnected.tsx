import { Link } from "@tanstack/react-router";
import { PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotConnected() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
        <PlugZap className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold">Conecte seu n8n</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Para visualizar execuções, erros e métricas, configure a URL e a API Key
        do seu n8n.
      </p>
      <Button asChild className="mt-6">
        <Link to="/settings">Configurar conexão</Link>
      </Button>
    </div>
  );
}
