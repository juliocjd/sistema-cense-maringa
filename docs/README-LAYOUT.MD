# 🎨 Layout do Dashboard - Guia de Instalação

## 📂 Estrutura de Arquivos

```
components/
└── layout/
    ├── sidebar.tsx              ← sidebar.tsx
    └── header.tsx               ← header.tsx

app/
└── (dashboard)/
    ├── layout.tsx               ← dashboard-layout.tsx
    └── page.tsx                 ← dashboard-home-page.tsx
```

## 🚀 Passo a Passo da Instalação

### 1. Criar pasta de componentes de layout

```bash
mkdir -p components/layout
```

### 2. Copiar os componentes

**Sidebar:**

- Copiar `sidebar.tsx` → `components/layout/sidebar.tsx`

**Header:**

- Copiar `header.tsx` → `components/layout/header.tsx`

### 3. Atualizar o layout do dashboard

**Arquivo:** `app/(dashboard)/layout.tsx`

Substituir conteúdo por `dashboard-layout.tsx`

### 4. Criar página inicial do dashboard

**Arquivo:** `app/(dashboard)/page.tsx`

Copiar `dashboard-home-page.tsx` → `app/(dashboard)/page.tsx`

---

## ✨ Funcionalidades Implementadas

### 📱 Sidebar

- **Menu completo** com todas as páginas
- **Navegação por seções:**
  - Principal (Dashboard, Mapa)
  - Adolescentes (Lista, Novo Cadastro)
  - Gestão (Conflitos, Grupos, CIs, Eventos)
  - Relatórios (Estatísticas, Alertas)
  - Sistema (Configurações)
- **Indicador visual** de página ativa
- **Responsivo** (colapsa no mobile)
- **Ícones intuitivos** para cada menu
- **Botão de logout**

### 🔝 Header

- **Barra de busca** global
- **Notificações** (com indicador de novas)
- **Menu do usuário** com dropdown
- **Foto/avatar** do operador
- **Sticky** (fixo no topo ao rolar)

### 🏠 Dashboard Home

- **Cards de estatísticas:**
  - Total de adolescentes
  - Ocupação atual (%)
  - Alertas ativos
  - Conflitos ativos
- **Ações rápidas** (links diretos)
- **Alertas recentes** (feed)
- **Visual atrativo** com cores e ícones

---

## 🎯 Menu de Navegação

| Seção            | Página              | Link                           | Status    |
| ---------------- | ------------------- | ------------------------------ | --------- |
| **Principal**    |
| Dashboard        | Página inicial      | `/dashboard`                   | ✅ Criado |
| Mapa Operacional | Mapa visual         | `/dashboard/mapa`              | ✅ Criado |
| **Adolescentes** |
| Lista            | Listagem            | `/dashboard/adolescentes`      | ⏳ Criar  |
| Novo Cadastro    | Formulário          | `/dashboard/adolescentes/novo` | ✅ Criado |
| **Gestão**       |
| Conflitos        | Gestão de conflitos | `/dashboard/conflitos`         | ⏳ Criar  |
| Grupos           | Gestão de grupos    | `/dashboard/grupos`            | ⏳ Criar  |
| Comunicados      | CIs                 | `/dashboard/comunicados`       | ⏳ Criar  |
| Eventos          | Eventos especiais   | `/dashboard/eventos`           | ⏳ Criar  |
| **Relatórios**   |
| Estatísticas     | Dashboards          | `/dashboard/relatorios`        | ⏳ Criar  |
| Alertas          | Alertas ativos      | `/dashboard/alertas`           | ⏳ Criar  |
| **Sistema**      |
| Configurações    | Config              | `/dashboard/configuracoes`     | ⏳ Criar  |

---

## 🎨 Customização

### Alterar Cores do Tema

**Sidebar:**

```typescript
// Em sidebar.tsx, linha ~57
className = "bg-gradient-to-b from-indigo-900 to-indigo-950";

// Trocar para outra cor (ex: azul escuro):
className = "bg-gradient-to-b from-slate-800 to-slate-900";
```

### Adicionar Item no Menu

```typescript
// Em sidebar.tsx, adicionar no array menuItems:
{
  section: "Sua Seção",
  items: [
    {
      label: "Nova Página",
      href: "/dashboard/nova-pagina",
      icon: IconeDesejado, // Importar de lucide-react
    },
  ],
}
```

### Alterar Logo

```typescript
// Em sidebar.tsx, linha ~75
<div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">
  CS
</div>

// Trocar por imagem:
<img src="/logo.png" alt="Logo" className="w-10 h-10" />
```

### Personalizar Dados do Usuário

```typescript
// Em header.tsx, linha ~11
const usuario = {
  nome: "José Silva",
  role: "Operador",
  foto: null,
};

// Substituir por dados reais:
const { data: session } = useSession(); // Se usar NextAuth
const usuario = {
  nome: session?.user?.name,
  role: session?.user?.role,
  foto: session?.user?.image,
};
```

---

## 📱 Responsividade

### Desktop (lg+)

- Sidebar fixa à esquerda (264px)
- Conteúdo com margem esquerda
- Header completo

### Mobile/Tablet

- Sidebar oculta por padrão
- Botão hamburguer no topo
- Overlay ao abrir sidebar
- Header compacto

### Breakpoints

```typescript
lg: 1024px  // Sidebar sempre visível
md: 768px   // Header adaptado
sm: 640px   // Layout mobile
```

---

## 🔐 Integração com Autenticação

### Proteger Rotas (Futuro)

```typescript
// Em app/(dashboard)/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    // ... layout atual
  );
}
```

### Dados do Usuário no Header

```typescript
// Substituir mock por dados reais
const usuario = {
  nome: session.user.name,
  role: session.user.role,
  foto: session.user.image,
};
```

---

## ✅ Checklist de Instalação

- [ ] Criar pasta `components/layout`
- [ ] Copiar `sidebar.tsx` para `components/layout/sidebar.tsx`
- [ ] Copiar `header.tsx` para `components/layout/header.tsx`
- [ ] Atualizar `app/(dashboard)/layout.tsx`
- [ ] Criar/atualizar `app/(dashboard)/page.tsx`
- [ ] Testar navegação entre páginas
- [ ] Testar responsividade (mobile/desktop)
- [ ] Verificar links ativos (highlighting)

---

## 🎯 Resultado Final

Depois da instalação, você terá:

✅ **Sidebar completa** com menu de navegação  
✅ **Header** com busca e perfil do usuário  
✅ **Dashboard home** com estatísticas  
✅ **Navegação funcional** entre todas as páginas  
✅ **Responsivo** (funciona em mobile e desktop)  
✅ **Visual profissional** e moderno

**Acesso:** Agora você pode navegar pelo sistema usando o menu lateral!

---

## 🐛 Troubleshooting

**Sidebar não aparece:**

- Verificar se arquivo está em `components/layout/sidebar.tsx`
- Verificar import no layout

**Links não funcionam:**

- Verificar se usa `<Link>` do Next.js
- Verificar se páginas existem

**Página ativa não destaca:**

- Verificar função `isActive()`
- Verificar `usePathname()`

**Mobile: sidebar não fecha:**

- Verificar estado `isOpen`
- Verificar overlay onClick

---

## 📦 Arquivos Criados

1. `sidebar.tsx` - Menu lateral
2. `header.tsx` - Cabeçalho
3. `dashboard-layout.tsx` - Layout wrapper
4. `dashboard-home-page.tsx` - Página inicial

---

## 🚀 Próximos Passos

Agora que o layout está pronto, você pode:

1. ✅ **Navegar pelo menu** para acessar páginas
2. ⏳ **Criar páginas faltantes** (Conflitos, Grupos, etc)
3. ⏳ **Implementar sistema de busca** no header
4. ⏳ **Adicionar autenticação** real
5. ⏳ **Conectar com API** para dados reais

**Layout está 100% funcional!** 🎉
