# Orçamentos — Panificadora Dreon

Sistema web para criar orçamentos profissionais, calcular automaticamente produtos vendidos por quilo, cento ou unidade, manter o catálogo e guardar o histórico.

## Tecnologia

- Next.js e TypeScript
- React e Tailwind CSS
- SQLite local (`better-sqlite3`)
- Apache como proxy reverso no servidor Debian
- `systemd` para manter a aplicação sempre ligada

## Página inicial

A página inicial é a rota `/`, implementada em `app/page.tsx`.

Em produção, o endereço sugerido é:

`https://orcamentos.panificadoradreon.com.br/`

## Desenvolvimento local

Requer Node.js 22 ou superior e pnpm.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://127.0.0.1:3000/`. O banco de desenvolvimento é criado automaticamente em `data/orcamentos-dreon.sqlite`.

## Servidor Debian

Siga o guia completo em `DEPLOY_DEBIAN.md`. Os modelos do serviço `systemd` e do Apache estão na pasta `deploy/`.
