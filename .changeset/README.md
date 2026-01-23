# Changesets

Este projeto usa [Changesets](https://github.com/changesets/changesets) para gerenciar versões e changelogs.

## Como adicionar um changeset

Quando você fizer mudanças que precisam ser versionadas, execute:

```bash
npm run changeset
```

Isso abrirá um prompt interativo para você descrever suas mudanças. O changeset será criado na pasta `.changeset/`.

## Como fazer release

1. Quando estiver pronto para fazer release, execute:
   ```bash
   npm run version-packages
   ```
   Isso atualizará as versões dos pacotes baseado nos changesets e criará um PR.

2. Após o PR ser mergeado na branch `main`, o workflow do GitHub Actions publicará automaticamente os pacotes no npm.

## Estrutura

- `packages/use-mask-input` - Pacote principal da biblioteca
- `apps/*` - Aplicações de exemplo (ignoradas no versionamento)
