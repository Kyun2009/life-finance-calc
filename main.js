const formatCurrency = (value) => {
  if (Number.isNaN(value)) return '값을 다시 입력해 주세요.';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
};

const updateActiveNav = () => {
  const page = document.body.dataset.page;
  if (!page) return;
  document.querySelectorAll('.site-nav a').forEach((link) => {
    if (link.dataset.page === page) {
      link.classList.add('active');
    }
  });
};

const calculators = {
  interest(form) {
    const principal = Number(form.querySelector('[name="principal"]').value);
    const rate = Number(form.querySelector('[name="rate"]').value) / 100;
    const months = Number(form.querySelector('[name="months"]').value);
    const interest = principal * rate * (months / 12);
    const total = principal + interest;
    return `예상 이자: ${formatCurrency(interest)}원 · 만기 금액: ${formatCurrency(total)}원`;
  },
  loan(form) {
    const principal = Number(form.querySelector('[name="loanPrincipal"]').value);
    const rate = Number(form.querySelector('[name="loanRate"]').value) / 100 / 12;
    const months = Number(form.querySelector('[name="loanMonths"]').value);
    if (rate === 0) {
      return `월 상환액: ${formatCurrency(principal / months)}원`;
    }
    const payment = principal * (rate * (1 + rate) ** months) / ((1 + rate) ** months - 1);
    return `월 상환액: ${formatCurrency(payment)}원`;
  },
  savings(form) {
    const monthly = Number(form.querySelector('[name="monthly"]').value);
    const rate = Number(form.querySelector('[name="savingsRate"]').value) / 100 / 12;
    const months = Number(form.querySelector('[name="savingsMonths"]').value);
    if (rate === 0) {
      return `예상 만기 금액: ${formatCurrency(monthly * months)}원`;
    }
    const futureValue = monthly * (((1 + rate) ** months - 1) / rate) * (1 + rate);
    return `예상 만기 금액: ${formatCurrency(futureValue)}원`;
  },
  percent(form) {
    const base = Number(form.querySelector('[name="base"]').value);
    const percent = Number(form.querySelector('[name="percent"]').value);
    const result = base * (percent / 100);
    return `${base}의 ${percent}%는 ${formatCurrency(result)}입니다.`;
  },
};

const attachCalculatorHandlers = () => {
  document.querySelectorAll('[data-calculator]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const type = form.dataset.calculator;
      const handler = calculators[type];
      if (!handler) return;
      const output = form.querySelector('.result');
      output.textContent = handler(form);
    });
  });
};

const run = () => {
  updateActiveNav();
  attachCalculatorHandlers();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
