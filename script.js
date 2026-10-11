"use strict";

/*
  BARBEARIA DOS CRIA
  Front-end: HTML, CSS e JavaScript
  Back-end: Node.js
  Banco de dados: SQLite

  CONFIGURAÇÃO:
  - whatsapp: número oficial com DDI e DDD, somente números.
    Exemplo: 5521999999999
  - apiBaseUrl: endereço da API local.
    O servidor Node.js deve estar em execução.
*/

const CONFIG = {
  address: "Rua Graciete Matarazzo, 18, Mangueira, Rio de Janeiro, RJ",
  whatsapp: "",
  apiBaseUrl: /^(localhost|127\.|10\.|192\.168\.)/.test(window.location.hostname)
    ? `http://${window.location.hostname}:3001/api`
    : "/api"
};

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;


/* =============================================
   1. DATA LOCAL
============================================= */

function localDateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}


/* =============================================
   2. CABEÇALHO E MENU
============================================= */

function initHeader() {
  const header = document.getElementById("header");
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("menu");

  if (!header || !toggle || !menu) return;

  let lastY = window.scrollY;

  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    header.classList.toggle("is-open", open);

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Fechar menu" : "Abrir menu"
    );
  };

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setMenu(open);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      setMenu(false);
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const isOpen =
        toggle.getAttribute("aria-expanded") === "true";

      header.classList.toggle("is-scrolled", y > 30);
      header.classList.toggle(
        "is-hidden",
        y > lastY && y > 420 && !isOpen
      );

      lastY = y;
    },
    { passive: true }
  );

  header.classList.toggle("is-scrolled", window.scrollY > 30);
}


/* =============================================
   3. ANIMAÇÕES AO ROLAR A PÁGINA
============================================= */

function initReveal() {
  const items = document.querySelectorAll(".reveal");

  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => {
      item.classList.add("is-visible");
    });

    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((item) => observer.observe(item));
}


/* =============================================
   4. FOTOS COM TENTATIVA DE OUTRAS EXTENSÕES
============================================= */

const EXTENSIONS = [
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
  ".JPG",
  ".JPEG",
  ".PNG"
];

function initImageFallback() {
  document.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    const match = src.match(/^(.*)(\.[a-z]+)$/i);

    if (!match) return;

    const base = match[1];
    const tried = new Set([match[2]]);

    const onError = () => {
      const next = EXTENSIONS.find((ext) => !tried.has(ext));

      if (next) {
        tried.add(next);
        img.src = base + next;
      } else {
        img.classList.add("is-missing");
      }
    };

    img.addEventListener("error", onError);

    if (
      img.complete &&
      img.naturalWidth === 0 &&
      img.getAttribute("loading") !== "lazy"
    ) {
      onError();
    }
  });
}


/* =============================================
   5. GALERIA: FOTO AMPLIADA
============================================= */

function initLightbox() {
  const box = document.getElementById("lightbox");
  const boxImg = document.getElementById("lightboxImg");
  const caption = document.getElementById("lightboxCaption");
  const closeBtn = document.getElementById("lightboxClose");

  if (
    !box ||
    !boxImg ||
    !caption ||
    !closeBtn ||
    typeof box.showModal !== "function"
  ) {
    return;
  }

  document.querySelectorAll(".gallery__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const img = btn.querySelector("img");
      const text = btn.parentElement.querySelector("figcaption");

      if (!img) return;

      boxImg.src = img.currentSrc || img.src;
      boxImg.alt = img.alt;

      caption.textContent = text
        ? text.textContent.trim()
        : "";

      box.showModal();
    });
  });

  closeBtn.addEventListener("click", () => {
    box.close();
  });

  box.addEventListener("click", (event) => {
    if (event.target === box) {
      box.close();
    }
  });
}


/* =============================================
   6. MAPA E RODAPÉ
============================================= */

function initContact() {
  const mapBtn = document.getElementById("mapBtn");

  if (mapBtn) {
    mapBtn.href =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(CONFIG.address);
  }

  const year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}


/* =============================================
   7. VALIDAÇÃO DO FORMULÁRIO
============================================= */

const validators = {
  nome: (value) => {
    return value.trim().length >= 3
      ? ""
      : "Informe seu nome (mínimo 3 letras).";
  },

  telefone: (value) => {
    const digits = value.replace(/\D/g, "");

    return digits.length === 10 || digits.length === 11
      ? ""
      : "Informe um telefone com DDD (10 ou 11 dígitos).";
  },

  servico: (value) => {
    return value
      ? ""
      : "Selecione um serviço.";
  },

  data: (value) => {
    if (!value) {
      return "Escolha uma data.";
    }

    return value >= localDateISO()
      ? ""
      : "Escolha uma data de hoje em diante.";
  },

  horario: (value) => {
    return value
      ? ""
      : "Escolha um horário.";
  }
};


function showError(form, name, message) {
  const input = form.elements[name];

  if (!input) return;

  const field = input.closest(".field");

  if (field) {
    field.classList.toggle("has-error", Boolean(message));
  }

  input.setAttribute("aria-invalid", String(Boolean(message)));

  const error = document.getElementById(`${name}-erro`);

  if (error) {
    error.textContent = message;
  }
}


function validateForm(form) {
  let valid = true;

  Object.entries(validators).forEach(([name, validate]) => {
    const input = form.elements[name];

    if (!input) {
      valid = false;
      console.error(
        `Campo "${name}" não encontrado no formulário.`
      );
      return;
    }

    const message = validate(input.value);

    showError(form, name, message);

    if (message) {
      valid = false;
    }
  });

  return valid;
}


/* =============================================
   8. WHATSAPP
============================================= */

function formatDate(iso) {
  const [year, month, day] = iso.split("-");

  return `${day}/${month}/${year}`;
}


function buildWhatsAppMessage(payload) {
  return [
    "Olá! Gostaria de solicitar um agendamento na Barbearia dos Cria.",
    "",
    `Nome: ${payload.nome.trim()}`,
    `Telefone: ${payload.telefone.trim()}`,
    `Serviço: ${payload.servico}`,
    `Data pretendida: ${formatDate(payload.data)}`,
    `Horário pretendido: ${payload.horario}`,
    "",
    "Se possível, me confirme a disponibilidade. Obrigado!"
  ].join("\n");
}


/* =============================================
   9. COMUNICAÇÃO COM O BACK-END
============================================= */

async function submitBooking(payload) {
  if (!CONFIG.apiBaseUrl) {
    throw new Error("O endereço da API não foi configurado.");
  }

  let response;

  try {
    response = await fetch(
      `${CONFIG.apiBaseUrl}/bookings`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
  } catch (error) {
    console.error("Falha na conexão com a API:", error);

    throw new Error(
      "Não foi possível conectar ao servidor. " +
      "Confira se o terminal do Node.js continua aberto " +
      "e se a API está funcionando na porta 3001."
    );
  }

  let resultado;
  const respostaTexto = await response.text();

  try {
    resultado = respostaTexto
      ? JSON.parse(respostaTexto)
      : {};
  } catch {
    console.error(
      "A API retornou uma resposta que não é JSON:",
      respostaTexto
    );

    throw new Error(
      "O servidor respondeu em um formato inesperado."
    );
  }

  if (!response.ok) {
    console.error("A API recusou o agendamento:", {
      status: response.status,
      resposta: resultado
    });

    throw new Error(
      resultado.erro ||
      `O servidor recusou a solicitação (HTTP ${response.status}).`
    );
  }

  return resultado;
}


/* =============================================
   10. FORMULÁRIO DE AGENDAMENTO
============================================= */

function initForm() {
  const form = document.getElementById("bookingForm");
  const status = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (!form || !status || !submitBtn) {
    console.warn(
      "Formulário não inicializado: confira bookingForm, " +
      "formStatus e submitBtn no HTML."
    );
    return;
  }

  const defaultLabel = submitBtn.textContent;

  const campoData = form.elements.data;

  if (campoData) {
    campoData.min = localDateISO();
  }

  Object.keys(validators).forEach((name) => {
    const input = form.elements[name];

    if (!input) {
      console.warn(`Campo "${name}" não encontrado no HTML.`);
      return;
    }

    const recheck = () => {
      showError(form, name, validators[name](input.value));
    };

    input.addEventListener("blur", recheck);

    ["input", "change"].forEach((eventName) => {
      input.addEventListener(eventName, () => {
        if (input.getAttribute("aria-invalid") === "true") {
          recheck();
        }
      });
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    status.textContent = "";

    if (!validateForm(form)) {
      status.textContent = "Revise os campos destacados.";

      form.querySelector("[aria-invalid='true']")?.focus();

      return;
    }

    const payload = Object.fromEntries(
      new FormData(form).entries()
    );

    /*
      MODO WHATSAPP:
      Usado somente quando apiBaseUrl estiver como null.
    */

    if (!CONFIG.apiBaseUrl) {
      if (!CONFIG.whatsapp) {
        status.textContent =
          "Falta configurar o número oficial do WhatsApp " +
          "em CONFIG.whatsapp, no arquivo script.js.";

        return;
      }

      const url =
        `https://wa.me/${CONFIG.whatsapp}?text=` +
        encodeURIComponent(buildWhatsAppMessage(payload));

      window.open(url, "_blank", "noopener,noreferrer");

      status.textContent =
        "Confira e envie a mensagem pelo WhatsApp. " +
        "O horário só estará confirmado após a resposta da barbearia.";

      return;
    }

    /*
      MODO BACK-END:
      Envia os dados para o Node.js, que os salva no SQLite.
    */

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const resultado = await submitBooking(payload);

      console.log(
        "Solicitação recebida pela API:",
        resultado
      );

      status.textContent =
        resultado.mensagem ||
        "Solicitação enviada. Aguarde a confirmação da barbearia.";

      form.reset();

      if (campoData) {
        campoData.min = localDateISO();
      }

      // Limpa as mensagens de validação após o envio.
      Object.keys(validators).forEach((name) => {
        showError(form, name, "");
      });

    } catch (error) {
      console.error("Erro no agendamento:", error);

      status.textContent =
        error.message ||
        "Não foi possível enviar agora. Tente novamente.";

    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = defaultLabel;
    }
  });
}


/* =============================================
   11. INICIALIZAÇÃO
============================================= */

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initReveal();
  initImageFallback();
  initLightbox();
  initContact();
  initForm();

  console.log("Barbearia dos Cria: JavaScript inicializado.");
});