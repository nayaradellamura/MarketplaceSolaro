# ☀️ Solaro - Marketplace de Energia Solar

**Solaro** é um **marketplace de energia solar** onde produtores de energia renovável (fornecedores) podem vender energia para consumidores de todo o Brasil. Clientes físicos podem trocar suas faturas tradicionais por energia limpa e sustentável, promovendo o uso consciente e a descentralização da matriz energética.

---

## 🌎 Propósito

O Solaro foi criado para conectar produtores de energia solar a consumidores finais, incentivando a transição para fontes renováveis e sustentáveis.

---

## 🔧 Tecnologias Utilizadas

- Node.js
- Express.js
- Handlebars (HBS)
- MySQL
- Express-Session
- bcryptjs
- Moment.js
- Dotenv
- Nodemailer
- SweetAlert2
- Nodemon


---

## 🚀 Como Executar o Projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/nayaradellamura/MarketplaceSolaro
cd MarketplaceSolaro
```

---

### 2. Instalar as dependências

```bash
npm install
```

---

### 3. Configurar o banco de dados MySQL

- Crie o banco de dados chamado `solaro`
- Importe o script SQL para criar as tabelas e estruturas:

```bash
mysql -u seu_usuario -p solaro < database/solaro.sql
```

---

### 4. Criar o arquivo `.env`

Na raiz do projeto, edite um arquivo chamado `.env` com o conteúdo:

```env
DATABASE = solaro
DATABASE_HOST =localhost 
DATABASE_USER =seu_usuario_mysql
DATABASE_PASS = sua_senha_mysql
PORTA =sua_porta_mysql
---

### 5. 🌞 Executar o servidor em modo produção

Use o `node` para facilitar:

```bash
npm start
```

---

### 6. Acessar o sistema

Abra o navegador e entre em:

```
http://localhost:5000
```

---

## 🧠 Funcionalidades Principais

- Cadastro e login para clientes e fornecedores
- Gestão de contratos de compra e venda de energia (kWh)
- Controle e consulta de estoque de energia por estado
- Precificação dinâmica e histórico de preços por estado
- Simulação de consumo e faturamento
- Painel de controle com informações detalhadas
- Envio de notificações por e-mail (exemplo com nodemailer)
- Segurança com criptografia de senhas e sessões protegidas

---

## 🔐 Segurança

- Senhas armazenadas com `bcryptjs`
- Sessões protegidas com `express-session`
- Validação de CPF/CNPJ via APIs externas (BrasilAPI, ViaCEP)

---

## 📄 Licença

Projeto acadêmico para fins educacionais.  

---

