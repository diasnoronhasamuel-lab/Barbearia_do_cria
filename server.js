"use strict";

const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT) || 3001;

// Banco de dados salvo na pasta do projeto
// (em hospedagem com disco persistente, defina DB_PATH)
const db = new DatabaseSync(
  process.env.DB_PATH || path.join(__dirname, "barbearia.db")
);

// Serviços disponíveis para agendamento
const servicos = [
  "Reflexo Alinhado",
  "Vermelhão",
  "Pigmentação",
  "Corte Americano",
  "Nevou",
  "Barba",
  "Corte + barba",
  "Corte do Jaca"
];

// Cria a tabela caso ela ainda não exista
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    servico TEXT NOT NULL,
    data TEXT NOT NULL,
    horario TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Resposta padrão em JSON
function responder(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });

  res.end(JSON.stringify(dados));
}

// Lê o corpo da requisição
function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";

    req.on("data", (parte) => {
      corpo += parte;

      if (corpo.length > 100_000) {
        reject(new Error("Dados enviados excedem o limite."));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(corpo || "{}"));
      } catch {
        reject(new Error("O conteúdo enviado não é um JSON válido."));
      }
    });

    req.on("error", reject);
  });
}

// Confere se a data existe de verdade no calendário
function dataValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const dataConvertida = new Date(
    Date.UTC(ano, mes - 1, dia)
  );

  return (
    dataConvertida.getUTCFullYear() === ano &&
    dataConvertida.getUTCMonth() === mes - 1 &&
    dataConvertida.getUTCDate() === dia
  );
}

// Compara textos ignorando acento decomposto e espaços invisíveis
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

// Confere a senha do painel (variável de ambiente ADMIN_PASSWORD)
function autorizado(req) {
  const senha = process.env.ADMIN_PASSWORD;

  if (!senha) return false;

  const recebido = (req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "");

  const a = crypto.createHash("sha256").update(recebido).digest();
  const b = crypto.createHash("sha256").update(senha).digest();

  return crypto.timingSafeEqual(a, b);
}

// Tipos de arquivo que o site pode servir (o banco e o server.js ficam de fora)
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

// Entrega o site (index.html, style.css, script.js, fotos e admin.html)
function servirArquivo(res, pathname) {
  let nome;

  try {
    nome = decodeURIComponent(pathname);
  } catch {
    return responder(res, 400, { erro: "Endereço inválido." });
  }

  if (nome === "/") nome = "/index.html";

  const arquivo = path.resolve(__dirname, "." + nome);
  const extensao = path.extname(arquivo).toLowerCase();
  const tipo =
    path.basename(arquivo) === "script.js"
      ? "text/javascript; charset=utf-8"
      : TIPOS[extensao];

  // Só arquivos da pasta principal e só de tipos permitidos
  if (!tipo || path.dirname(arquivo) !== __dirname) {
    return responder(res, 404, { erro: "Rota não encontrada." });
  }

  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) {
      return responder(res, 404, { erro: "Rota não encontrada." });
    }

    res.writeHead(200, { "Content-Type": tipo });
    res.end(conteudo);
  });
}

// Servidor HTTP
const servidor = http.createServer(async (req, res) => {
  let url;

  try {
    url = new URL(req.url, `http://localhost:${PORT}`);
  } catch {
    return responder(res, 400, {
      erro: "Endereço da requisição inválido."
    });
  }

  // Permite as requisições de verificação do navegador
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });

    return res.end();
  }

  // GET /api
  if (req.method === "GET" && url.pathname === "/api") {
    return responder(res, 200, {
      mensagem: "API da Barbearia dos Cria funcionando!",
      rotas: [
        "GET /api/servicos",
        "GET /api/bookings",
        "POST /api/bookings"
      ]
    });
  }

  // GET /api/servicos
  if (
    req.method === "GET" &&
    url.pathname === "/api/servicos"
  ) {
    return responder(res, 200, {
      mensagem: "Serviços disponíveis.",
      servicos
    });
  }

  // GET /api/bookings
  if (
    req.method === "GET" &&
    url.pathname === "/api/bookings"
  ) {
    if (!process.env.ADMIN_PASSWORD) {
      return responder(res, 503, {
        erro: "A senha do painel não foi configurada no servidor."
      });
    }

    if (!autorizado(req)) {
      return responder(res, 401, { erro: "Senha incorreta." });
    }

    try {
      const agendamentos = db.prepare(`
        SELECT
          id,
          nome,
          telefone,
          servico,
          data,
          horario,
          criado_em
        FROM bookings
        ORDER BY id DESC
      `).all();

      return responder(res, 200, { agendamentos });
    } catch (erro) {
      console.error("Erro ao consultar agendamentos:", erro);

      return responder(res, 500, {
        erro: "Não foi possível consultar os agendamentos."
      });
    }
  }

  // POST /api/bookings
  if (
    req.method === "POST" &&
    url.pathname === "/api/bookings"
  ) {
    let dados;

    try {
      dados = await lerCorpo(req);
    } catch (erro) {
      if (!res.destroyed && !res.writableEnded) {
        return responder(res, 400, {
          erro: erro.message
        });
      }

      return;
    }

    const nome = String(dados.nome ?? "").trim();
    const telefone = String(dados.telefone ?? "").trim();
    // Procura o serviço na lista oficial, ignorando diferenças invisíveis
    const servico =
      servicos.find(
        (s) => normalizar(s) === normalizar(dados.servico)
      ) ?? "";
    const data = String(dados.data ?? "").trim();
    const horario = String(dados.horario ?? "").trim();

    const digitosTelefone = telefone.replace(/\D/g, "");

    // Validação do nome
    if (nome.length < 3 || nome.length > 100) {
      return responder(res, 400, {
        erro: "Informe um nome entre 3 e 100 caracteres."
      });
    }

    // Validação do telefone com DDD
    if (![10, 11].includes(digitosTelefone.length)) {
      return responder(res, 400, {
        erro: "Informe um telefone válido com DDD."
      });
    }

    // Validação do serviço
    if (!servicos.includes(servico)) {
      return responder(res, 400, {
        erro: "O serviço selecionado não é válido.",
        servicosDisponiveis: servicos
      });
    }

    // Validação da data
    if (!dataValida(data)) {
      return responder(res, 400, {
        erro: "Informe uma data válida."
      });
    }

    // Impede datas anteriores ao dia atual
    const hoje = new Date();

    const hojeISO = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, "0"),
      String(hoje.getDate()).padStart(2, "0")
    ].join("-");

    if (data < hojeISO) {
      return responder(res, 400, {
        erro: "A data do agendamento não pode estar no passado."
      });
    }

    // Validação do horário no formato HH:MM
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
      return responder(res, 400, {
        erro: "Informe um horário válido."
      });
    }

    // Salva no banco de dados SQLite
    try {
      const resultado = db.prepare(`
        INSERT INTO bookings (
          nome,
          telefone,
          servico,
          data,
          horario
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        nome,
        telefone,
        servico,
        data,
        horario
      );

      console.log(
        `Novo agendamento salvo. ID: ${resultado.lastInsertRowid}`
      );

      return responder(res, 201, {
        mensagem:
          "Agendamento salvo com sucesso! Aguarde a confirmação da barbearia.",
        id: Number(resultado.lastInsertRowid)
      });
    } catch (erro) {
      console.error("Erro ao salvar no SQLite:", erro);

      return responder(res, 500, {
        erro: "Não foi possível salvar o agendamento."
      });
    }
  }

  // Qualquer outro endereço (GET): entrega o site
  if (req.method === "GET" && !url.pathname.startsWith("/api")) {
    return servirArquivo(res, url.pathname);
  }

  // Rota não encontrada
  return responder(res, 404, {
    erro: "Rota não encontrada."
  });
});

// Trata erros inesperados do servidor
servidor.on("error", (erro) => {
  console.error("Erro no servidor:", erro.message);

  if (erro.code === "EADDRINUSE") {
    console.error(
      `A porta ${PORT} já está em uso. Encerre o servidor antigo e tente novamente.`
    );
  }

  db.close();
  process.exitCode = 1;
});

// Inicia o servidor
servidor.listen(PORT, () => {
  console.log("----------------------------------------");
  console.log("BARBEARIA DOS CRIA");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Site: http://localhost:${PORT}`);
  console.log(`Serviços cadastrados: ${servicos.length}`);
  console.log("Banco de dados: barbearia.db");
  console.log("----------------------------------------");
});

// Fecha o banco corretamente ao encerrar com Ctrl+C
process.on("SIGINT", () => {
  console.log("\nEncerrando servidor...");

  servidor.close(() => {
    db.close();
    console.log("Servidor encerrado.");
    process.exit(0);
  });
});