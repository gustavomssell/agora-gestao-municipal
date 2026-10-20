# Ágora — frontend

Interface React + Vite do Ágora. Consulte o [README do repositório](../README.md) para configuração da API, banco de dados, acessos de demonstração e execução completa.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
```

A API é lida de `VITE_API_URL` (padrão `http://localhost:8090/api`). Para gerar o build apontando para o mesmo domínio via proxy reverso, use `VITE_API_URL=/api`.
