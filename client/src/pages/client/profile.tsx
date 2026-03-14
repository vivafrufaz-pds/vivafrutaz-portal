import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Building2, Phone, Mail, MapPin, Tag, Calendar, CreditCard, AlertCircle, User, Clock } from "lucide-react";

function CompanyMissing() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-orange-500" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Dados da empresa não encontrados.</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        Não foi possível carregar as informações da sua empresa. Entre em contato com a equipe VivaFrutaz.
      </p>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string | undefined | null; icon: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-bold text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

const CLIENT_TYPE_LABEL: Record<string, string> = {
  mensal: "Mensal",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  pontual: "Pontual",
};

export default function ClientProfile() {
  const { company } = useAuth();

  if (!company) {
    return (
      <Layout>
        <CompanyMissing />
      </Layout>
    );
  }

  const allowedDays: string[] = Array.isArray(company.allowedOrderDays)
    ? (company.allowedOrderDays as any[]).map(String)
    : [];

  const fullAddress = [
    company.addressStreet && `${company.addressStreet}${company.addressNumber ? ", " + company.addressNumber : ""}`,
    company.addressNeighborhood,
    company.addressCity,
    company.addressZip,
  ].filter(Boolean).join(" — ");

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-extrabold">{company.companyName}</h1>
              <p className="text-primary-foreground/80 text-sm font-medium mt-0.5">{company.email}</p>
              <span className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-bold ${company.active ? 'bg-white/20 text-white' : 'bg-red-200/30 text-red-100'}`}>
                {company.active ? "Cliente Ativo" : "Conta Inativa"}
              </span>
            </div>
          </div>
        </div>

        {/* Dados de contato */}
        <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6">
          <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Dados de Contato
          </h2>
          <div className="divide-y divide-border/40">
            <InfoRow label="Responsável" value={company.contactName} icon={User} />
            <InfoRow label="E-mail principal" value={company.email} icon={Mail} />
            {company.notificationEmail && (
              <InfoRow label="E-mail de notificações" value={company.notificationEmail} icon={Mail} />
            )}
            <InfoRow label="Telefone" value={company.phone} icon={Phone} />
            <InfoRow label="CNPJ" value={company.cnpj} icon={CreditCard} />
          </div>
        </div>

        {/* Endereço */}
        {fullAddress && (
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6">
            <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Endereço de Entrega
            </h2>
            <div className="flex items-start gap-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mt-1">{fullAddress}</p>
            </div>
          </div>
        )}

        {/* Configuração de pedidos */}
        <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6">
          <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Configuração de Pedidos
          </h2>
          <div className="divide-y divide-border/40">
            <InfoRow
              label="Tipo de cliente"
              value={CLIENT_TYPE_LABEL[company.clientType || ""] || company.clientType || undefined}
              icon={Tag}
            />
            <InfoRow label="Horário de entrega" value={company.deliveryTime} icon={Clock} />
            {allowedDays.length > 0 && (
              <div className="py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dias de entrega</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allowedDays.map(d => (
                      <span key={d} className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financeiro */}
        {(company.billingTerm || company.billingType || company.billingFormat || company.paymentDates) && (
          <div className="bg-card rounded-2xl border border-border/50 premium-shadow p-6">
            <h2 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Informações Financeiras
            </h2>
            <div className="divide-y divide-border/40">
              <InfoRow label="Prazo de pagamento" value={company.billingTerm} icon={Calendar} />
              <InfoRow label="Tipo de cobrança" value={company.billingType} icon={CreditCard} />
              <InfoRow label="Formato de cobrança" value={company.billingFormat} icon={CreditCard} />
              <InfoRow label="Datas de pagamento" value={company.paymentDates} icon={Calendar} />
              {company.financialNotes && (
                <div className="py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações financeiras</p>
                  <p className="text-sm text-foreground">{company.financialNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 bg-muted/30 rounded-2xl text-center">
          <p className="text-xs text-muted-foreground">
            Para atualizar seus dados, entre em contato com a equipe VivaFrutaz.
          </p>
        </div>
      </div>
    </Layout>
  );
}
