"use strict";

/*
  CONFIGURAÇÃO DO PROJETO

  1. Preencha whatsapp com o número oficial autorizado.
  2. Use o formato: 5521999999999
  3. Não use +, espaços ou traços no número.
  4. apiBaseUrl ficará null até criarmos o backend.
*/

const CONFIG = {
  address: "Rua Graciete Matarazzo, 18, Mangueira, Rio de Janeiro, RJ",
  whatsapp: "", // Preencher com o número oficial
  apiBaseUrl: null
};

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ===== DATA LOCAL ===== */

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ===== CABEÇALHO E MENU ===== */

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
    const isOpen =
      toggle.getAttribute("aria-expanded") === "true";

    setMenu(!isOpen);
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

  window.addEventListener("scroll", () => {
    const y = window.scrollY;

    header.classList.toggle("is-scrolled", y > 30);

    const isOpen =
      toggle.getAttribute("aria-expanded") === "true";

    header.classList.toggle(
      "is-hidden",
      y > lastY && y > 420 && !isOpen
    );

    lastY = y;
  }, { passive: true });

  header.classList.toggle("is-scrolled", window.scrollY > 30);
}

/* ===== ANIMAÇÕES AO ROLAR A PÁGINA ===== */

function initReveal() {
  const items = document.querySelectorAll(".reveal");

  if (
    reducedMotion ||
    !("IntersectionObserver" in window)
  ) {
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

/* ===== TRATAMENTO DE IMAGENS COM ERRO ===== */

function initImageFallback() {
  document.querySelectorAll("img").forEach((img) => {
    const hide = () => {
      img.classList.add("is-missing");
    };

    img.addEventListener("error", hide);

    if (img.complete && img.naturalWidth === 0) {
      hide();
    }
  });
}

/* ===== MAPA E RODAPÉ ===== */

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

/* ===== VALIDAÇÃO DO FORMULÁRIO ===== */

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

/* Mostra ou remove a mensagem de erro */

function showError(form, name, message) {
  const input = form.elements[name];
  const field = input?.closest(".field");

  if (!field || !input) return;

  field.classList.toggle("has-error", Boolean(message));

  input.setAttribute(
    "aria-invalid",
    String(Boolean(message))
  );

  const error = document.getElementById(`${name}-erro`);

  if (error) {
    error.textContent = message;
  }
}

/* Verifica todos os campos */

function validateForm(form) {
  let valid = true;

  Object.entries(validators).forEach(([name, validator]) => {
    const message = validator(form.elements[name].value);

    showError(form, name, message);

    if (message) {
      valid = false;
    }
  });

  return valid;
}

/* ===== MENSAGEM DO WHATSAPP ===== */

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");

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

/* ===== PONTO DE INTEGRAÇÃO COM O BACKEND ===== */

/*
  Esta função ficará pronta para receber a API Node.js/Express.

  Enquanto apiBaseUrl for null, o envio pelo formulário
  utiliza o WhatsApp.

  Quando o backend existir, precisaremos configurar a URL
  e implementar a rota POST /bookings no servidor.
*/

async function submitBooking(payload) {
  if (!CONFIG.apiBaseUrl) {
    return { demo: true };
  }

  const response = await fetch(
    `${CONFIG.apiBaseUrl}/bookings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    throw new Error("Falha ao enviar o agendamento.");
  }

  return response.json();
}

/* ===== FORMULÁRIO ===== */

function initForm() {
  const form = document.getElementById("bookingForm");
  const status = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (!form || !status || !submitBtn) return;

  const dateInput = form.elements.data;

  // Usa a data local, evitando diferenças causadas pelo UTC.
  dateInput.min = localDateISO();

  Object.keys(validators).forEach((name) => {
    const input = form.elements[name];

    input.addEventListener("blur", () => {
      showError(
        form,
        name,
        validators[name](input.value)
      );
    });

    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        showError(
          form,
          name,
          validators[name](input.value)
        );
      }
    });

    input.addEventListener("change", () => {
      if (input.getAttribute("aria-invalid") === "true") {
        showError(
          form,
          name,
          validators[name](input.value)
        );
      }
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

    // Verificação adicional da data.
    if (payload.data < localDateISO()) {
      showError(
        form,
        "data",
        "Escolha uma data de hoje em diante."
      );

      status.textContent = "Revise a data escolhida.";

      return;
    }

    /*
      SEM BACKEND:
      abre o WhatsApp com a mensagem pronta.
    */

    if (!CONFIG.apiBaseUrl) {
      if (!CONFIG.whatsapp) {
        status.textContent =
          "O formulário está pronto, mas falta configurar " +
          "o número oficial do WhatsApp em CONFIG.whatsapp " +
          "no arquivo script.js.";

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
      COM BACKEND:
      envia os dados à API.
    */

    submitBtn.disabled = true;
    submitBtn.textContent = "ENVIANDO...";

    try {
      await submitBooking(payload);

      status.textContent =
        "Solicitação enviada. Aguarde a confirmação da barbearia.";

      form.reset();

      dateInput.min = localDateISO();

    } catch (error) {
      status.textContent =
        "Não foi possível enviar agora. Tente novamente.";

    } finally {
      submitBtn.disabled = false;

      submitBtn.innerHTML =
        'CONTINUAR PELO WHATSAPP <span aria-hidden="true">↗</span>';
    }
  });
}

/* ===== INICIALIZAÇÃO ===== */

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initReveal();
  initImageFallback();
  initContact();
  initForm();
});