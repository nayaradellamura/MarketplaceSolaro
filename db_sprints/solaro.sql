-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Tempo de geração: 02/06/2025 às 19:45
-- Versão do servidor: 8.0.42-0ubuntu0.24.04.1
-- Versão do PHP: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `solaro`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `contratos_clientes`
--

CREATE TABLE `contratos_clientes` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `data_inicio` date NOT NULL,
  `data_cancelamento` date DEFAULT NULL,
  `estado_cliente` varchar(2) NOT NULL,
  `consumo_medio_kwh` decimal(10,2) DEFAULT NULL,
  `preco_final_kwh` decimal(6,4) DEFAULT NULL,
  `status` enum('A','C') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'A',
  `historico_preco_id` int DEFAULT NULL,
  `consumo_fatura_1` decimal(10,2) DEFAULT NULL,
  `consumo_fatura_2` decimal(10,2) DEFAULT NULL,
  `consumo_fatura_3` decimal(10,2) DEFAULT NULL,
  `consumo_media_fatura` decimal(10,2) DEFAULT NULL,
  `valor_fatura_1` decimal(8,2) DEFAULT NULL,
  `valor_fatura_2` decimal(8,2) DEFAULT NULL,
  `valor_fatura_3` decimal(8,2) DEFAULT NULL,
  `media_valor_fatura` decimal(10,4) DEFAULT NULL,
  `flag_cliente` int DEFAULT NULL,
  `valor_economizado` decimal(10,4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `contratos_fornecedores`
--

CREATE TABLE `contratos_fornecedores` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `data_assinatura` date NOT NULL,
  `data_final` date NOT NULL,
  `prazo_contrato` int NOT NULL,
  `estado_fazenda` varchar(2) NOT NULL,
  `preco_kwh` decimal(6,4) NOT NULL,
  `geracao_kwh` decimal(10,2) NOT NULL,
  `status` enum('AT','RE') DEFAULT 'AT',
  `receita_prevista` decimal(10,2) DEFAULT NULL,
  `data_rescisao` date DEFAULT NULL,
  `flag_fornecedor` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `enderecos`
--

CREATE TABLE `enderecos` (
  `id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `cep` varchar(10) DEFAULT NULL,
  `rua` varchar(100) DEFAULT NULL,
  `numero` varchar(10) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `pais` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `estoque_kwh_estado`
--

CREATE TABLE `estoque_kwh_estado` (
  `id` int NOT NULL,
  `estado` varchar(2) NOT NULL,
  `mes_referencia` date NOT NULL,
  `kwh_disponivel` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `estoque_kwh_estado`
--

INSERT INTO `estoque_kwh_estado` (`id`, `estado`, `mes_referencia`, `kwh_disponivel`) VALUES
(1, 'AC', '2025-05-28', 29566.04),
(2, 'AL', '2025-05-28', 66313.31),
(3, 'AM', '2025-05-28', 31762.69),
(4, 'AP', '2025-05-28', 1873.53),
(5, 'BA', '2025-05-28', 3079.58),
(6, 'CE', '2025-05-28', 54777.30),
(7, 'DF', '2025-05-28', 63647.77),
(8, 'ES', '2025-05-28', 51672.93),
(9, 'GO', '2025-05-28', 72591.37),
(10, 'MA', '2025-05-28', 3236.07),
(11, 'MG', '2025-05-28', 97406.23),
(12, 'MS', '2025-05-28', 76322.96),
(13, 'MT', '2025-05-28', 88396.10),
(14, 'PA', '2025-05-28', 12111.62),
(15, 'PB', '2025-05-28', 93869.81),
(16, 'PE', '2025-05-28', 32314.18),
(17, 'PI', '2025-05-28', 78961.47),
(18, 'PR', '2025-05-28', 96864.81),
(19, 'RJ', '2025-05-28', 50939.66),
(20, 'RN', '2025-05-28', 40603.86),
(21, 'RO', '2025-05-28', 62700.33),
(22, 'RR', '2025-05-28', 90690.06),
(23, 'RS', '2025-05-28', 64349.33),
(24, 'SC', '2025-05-28', 48676.46),
(25, 'SE', '2025-05-28', 49334.31),
(26, 'SP', '2025-05-28', 150000.00),
(27, 'TO', '2025-05-28', 49207.99);

-- --------------------------------------------------------

--
-- Estrutura para tabela `historico_precos`
--

CREATE TABLE `historico_precos` (
  `id` int NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `estado` varchar(2) NOT NULL,
  `preco_base_fornecedor` decimal(8,4) NOT NULL,
  `taxa_percentual` decimal(5,2) NOT NULL,
  `preco_final_cliente` decimal(8,4) NOT NULL,
  `data_inicio` date NOT NULL,
  `data_fim` date DEFAULT NULL,
  `contrato_cliente_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `leituras_consumo`
--

CREATE TABLE `leituras_consumo` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `mes_referencia` date NOT NULL,
  `consumo_kwh` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `pagamento_cliente`
--

CREATE TABLE `pagamento_cliente` (
  `id_pagamento` int NOT NULL,
  `id_contrato` int NOT NULL,
  `id_cliente` int NOT NULL,
  `valor_total` decimal(10,2) NOT NULL,
  `data_pagamento` date DEFAULT NULL,
  `forma_pagamento` varchar(30) DEFAULT NULL,
  `status_pagamento` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'PEND',
  `dh_inclusao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `recebimento_fornecedor`
--

CREATE TABLE `recebimento_fornecedor` (
  `id_recebimento` int NOT NULL,
  `id_contrato` int NOT NULL,
  `id_fornecedor` int NOT NULL,
  `valor_repasse` decimal(10,2) NOT NULL,
  `data_repasse` date DEFAULT NULL,
  `status_repasse` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'PEND',
  `taxa_administrativa` decimal(10,2) DEFAULT '0.00',
  `dh_inclusao` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `taxa_estaduais`
--

CREATE TABLE `taxa_estaduais` (
  `id` int NOT NULL,
  `estado` varchar(2) NOT NULL,
  `taxa` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Despejando dados para a tabela `taxa_estaduais`
--

INSERT INTO `taxa_estaduais` (`id`, `estado`, `taxa`) VALUES
(1, 'AC', 0.62),
(2, 'AL', 0.58),
(3, 'AP', 0.63),
(4, 'AM', 0.68),
(5, 'BA', 0.8),
(6, 'CE', 0.71),
(7, 'DF', 0.73),
(8, 'ES', 0.77),
(9, 'GO', 0.74),
(10, 'MA', 0.6),
(11, 'MT', 0.67),
(12, 'MS', 0.66),
(13, 'MG', 0.72),
(14, 'PA', 0.69),
(15, 'PB', 0.59),
(16, 'PR', 0.7),
(17, 'PE', 0.79),
(18, 'PI', 0.57),
(19, 'RJ', 0.88),
(20, 'RN', 0.56),
(21, 'RS', 0.75),
(22, 'RO', 0.65),
(23, 'RR', 0.64),
(24, 'SC', 0.78),
(25, 'SP', 0.76),
(26, 'SE', 0.55),
(27, 'TO', 0.61);

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int NOT NULL,
  `cpf_cnpj` varchar(20) DEFAULT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `contato` varchar(20) DEFAULT NULL,
  `tipo` enum('C','F') NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `senha` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `contratos_clientes`
--
ALTER TABLE `contratos_clientes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `historico_preco_id` (`historico_preco_id`);

--
-- Índices de tabela `contratos_fornecedores`
--
ALTER TABLE `contratos_fornecedores`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `enderecos`
--
ALTER TABLE `enderecos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `estoque_kwh_estado`
--
ALTER TABLE `estoque_kwh_estado`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `historico_precos`
--
ALTER TABLE `historico_precos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_historico_usuario` (`usuario_id`);

--
-- Índices de tabela `leituras_consumo`
--
ALTER TABLE `leituras_consumo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`);

--
-- Índices de tabela `pagamento_cliente`
--
ALTER TABLE `pagamento_cliente`
  ADD PRIMARY KEY (`id_pagamento`),
  ADD KEY `fk_pag_cliente_contrato` (`id_contrato`),
  ADD KEY `fk_pag_cliente_cliente` (`id_cliente`);

--
-- Índices de tabela `recebimento_fornecedor`
--
ALTER TABLE `recebimento_fornecedor`
  ADD PRIMARY KEY (`id_recebimento`),
  ADD KEY `fk_rec_forn_contrato` (`id_contrato`),
  ADD KEY `fk_rec_forn_fornecedor` (`id_fornecedor`);

--
-- Índices de tabela `taxa_estaduais`
--
ALTER TABLE `taxa_estaduais`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `cpf_cnpj` (`cpf_cnpj`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `contratos_clientes`
--
ALTER TABLE `contratos_clientes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `contratos_fornecedores`
--
ALTER TABLE `contratos_fornecedores`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `enderecos`
--
ALTER TABLE `enderecos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `estoque_kwh_estado`
--
ALTER TABLE `estoque_kwh_estado`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de tabela `historico_precos`
--
ALTER TABLE `historico_precos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `leituras_consumo`
--
ALTER TABLE `leituras_consumo`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pagamento_cliente`
--
ALTER TABLE `pagamento_cliente`
  MODIFY `id_pagamento` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `recebimento_fornecedor`
--
ALTER TABLE `recebimento_fornecedor`
  MODIFY `id_recebimento` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `taxa_estaduais`
--
ALTER TABLE `taxa_estaduais`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT de tabela `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `contratos_clientes`
--
ALTER TABLE `contratos_clientes`
  ADD CONSTRAINT `contratos_clientes_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `contratos_clientes_ibfk_2` FOREIGN KEY (`historico_preco_id`) REFERENCES `historico_precos` (`id`);

--
-- Restrições para tabelas `contratos_fornecedores`
--
ALTER TABLE `contratos_fornecedores`
  ADD CONSTRAINT `contratos_fornecedores_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Restrições para tabelas `enderecos`
--
ALTER TABLE `enderecos`
  ADD CONSTRAINT `enderecos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Restrições para tabelas `historico_precos`
--
ALTER TABLE `historico_precos`
  ADD CONSTRAINT `fk_historico_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `leituras_consumo`
--
ALTER TABLE `leituras_consumo`
  ADD CONSTRAINT `leituras_consumo_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Restrições para tabelas `pagamento_cliente`
--
ALTER TABLE `pagamento_cliente`
  ADD CONSTRAINT `fk_pag_cliente_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_pag_cliente_contrato` FOREIGN KEY (`id_contrato`) REFERENCES `contratos_clientes` (`id`);

--
-- Restrições para tabelas `recebimento_fornecedor`
--
ALTER TABLE `recebimento_fornecedor`
  ADD CONSTRAINT `fk_rec_forn_contrato` FOREIGN KEY (`id_contrato`) REFERENCES `contratos_fornecedores` (`id`),
  ADD CONSTRAINT `fk_rec_forn_fornecedor` FOREIGN KEY (`id_fornecedor`) REFERENCES `usuarios` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
