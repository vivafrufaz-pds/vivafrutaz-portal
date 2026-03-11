import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Leaf, Building2, UserCircle } from "lucide-react";

export default function Login() {
  const { login, isLoggingIn } = useAuth();
  const [type, setType] = useState<'admin' | 'company'>('company');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password, type });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/25 transform -rotate-6">
            <Leaf className="w-10 h-10 text-primary-foreground transform rotate-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-extrabold text-foreground">
          VivaFrutaz
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Plataforma Corporativa de Pedidos de Frutas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-card py-8 px-4 shadow-2xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-border/50">
          
          <div className="flex p-1 space-x-1 bg-muted/50 rounded-xl mb-8">
            <button
              data-testid="tab-company"
              onClick={() => setType('company')}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                type === 'company' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-4 h-4" /> Portal do Cliente
            </button>
            <button
              data-testid="tab-admin"
              onClick={() => setType('admin')}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
                type === 'admin' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCircle className="w-4 h-4" /> Acesso da Equipe
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Email
              </label>
              <input
                data-testid="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="voce@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Senha
              </label>
              <input
                data-testid="input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              data-testid="button-login"
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/25 text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoggingIn ? "Entrando..." : "Acessar VivaFrutaz"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
