# Instruções para Publicação (Google Play & App Store)

Este aplicativo foi desenvolvido como uma Web App (SPA) responsiva. Para publicá-lo nas lojas como um aplicativo nativo, recomendamos o uso do **Capacitor**.

## Passos para gerar os arquivos:

1. **Instalar Capacitor:**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init
   ```

2. **Adicionar Plataformas:**
   ```bash
   npm install @capacitor/android @capacitor/ios
   npx cap add android
   npx cap add ios
   ```

3. **Gerar Build:**
   ```bash
   npm run build
   npx cap copy
   ```

4. **Abrir nos IDEs Nativos:**
   - Para Android: `npx cap open android` (requer Android Studio)
   - Para iOS: `npx cap open ios` (requer Xcode em um Mac)

## Requisitos de Backend:
Para a versão de produção nas lojas, você precisará hospedar o arquivo `server.ts` e o banco de dados `database.sqlite` em um servidor (como Heroku, DigitalOcean ou AWS) e atualizar as URLs de API no frontend para apontar para o seu servidor de produção.

## Contato do Desenvolvedor:
patricioaug@gmail.com
