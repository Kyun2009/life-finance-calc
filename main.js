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

const parseNumber = (value) => Number(String(value).replace(/,/g, ''));

const getUnitSettings = () => {
  const rateUnit = localStorage.getItem('rateUnit') || 'annual';
  const amountUnit = localStorage.getItem('amountUnit') || 'krw';
  return { rateUnit, amountUnit };
};

const moneyFields = new Set([
  'principal',
  'loanPrincipal',
  'monthly',
  'amount',
  'contribution',
  'base',
]);

const getAmountMultiplier = (amountUnit) => (amountUnit === 'thousand' ? 1000 : 1);

const getRateMultiplier = (rateUnit) => (rateUnit === 'monthly' ? 12 : 1);

const rateFields = new Set(['rate', 'loanRate', 'savingsRate']);

const readValue = (form, name, amountUnit) => {
  const value = parseNumber(form.querySelector(`[name="${name}"]`).value);
  if (moneyFields.has(name)) {
    return value * getAmountMultiplier(amountUnit);
  }
  return value;
};

const calculators = {
  interest(form) {
    const { rateUnit, amountUnit } = getUnitSettings();
    const principal = readValue(form, 'principal', amountUnit);
    const rate = (parseNumber(form.querySelector('[name="rate"]').value) * getRateMultiplier(rateUnit)) / 100;
    const months = parseNumber(form.querySelector('[name="months"]').value);
    const interest = principal * rate * (months / 12);
    const total = principal + interest;
    return `예상 이자: ${formatCurrency(interest)}원 · 만기 금액: ${formatCurrency(total)}원`;
  },
  loan(form) {
    const { rateUnit, amountUnit } = getUnitSettings();
    const principal = readValue(form, 'loanPrincipal', amountUnit);
    const rate =
      (parseNumber(form.querySelector('[name="loanRate"]').value) * getRateMultiplier(rateUnit)) / 100 / 12;
    const months = parseNumber(form.querySelector('[name="loanMonths"]').value);
    if (rate === 0) {
      return `월 상환액: ${formatCurrency(principal / months)}원`;
    }
    const payment = principal * (rate * (1 + rate) ** months) / ((1 + rate) ** months - 1);
    return `월 상환액: ${formatCurrency(payment)}원`;
  },
  savings(form) {
    const { rateUnit, amountUnit } = getUnitSettings();
    const monthly = readValue(form, 'monthly', amountUnit);
    const rate =
      (parseNumber(form.querySelector('[name="savingsRate"]').value) * getRateMultiplier(rateUnit)) / 100 / 12;
    const months = parseNumber(form.querySelector('[name="savingsMonths"]').value);
    if (rate === 0) {
      return `예상 만기 금액: ${formatCurrency(monthly * months)}원`;
    }
    const futureValue = monthly * (((1 + rate) ** months - 1) / rate) * (1 + rate);
    return `예상 만기 금액: ${formatCurrency(futureValue)}원`;
  },
  percent(form) {
    const { amountUnit } = getUnitSettings();
    const base = readValue(form, 'base', amountUnit);
    const percent = parseNumber(form.querySelector('[name="percent"]').value);
    const result = base * (percent / 100);
    return `${base}의 ${percent}%는 ${formatCurrency(result)}입니다.`;
  },
  exchange(form) {
    const { amountUnit } = getUnitSettings();
    const amount = readValue(form, 'amount', amountUnit);
    const rate = parseNumber(form.querySelector('[name="rate"]').value);
    const direction = form.querySelector('[name="direction"]').value;
    if (rate === 0) {
      return '환율은 0보다 커야 합니다.';
    }
    const result = direction === 'toKrw' ? amount * rate : amount / rate;
    const suffix = direction === 'toKrw' ? '원' : '외화';
    return `환산 금액: ${formatCurrency(result)}${suffix}`;
  },
  compound(form) {
    const { rateUnit, amountUnit } = getUnitSettings();
    const principal = readValue(form, 'principal', amountUnit);
    const contribution = readValue(form, 'contribution', amountUnit);
    const annualRate = (parseNumber(form.querySelector('[name="rate"]').value) * getRateMultiplier(rateUnit)) / 100;
    const years = parseNumber(form.querySelector('[name="years"]').value);
    const frequency = parseNumber(form.querySelector('[name="frequency"]').value);
    const months = years * 12;
    if (annualRate === 0) {
      const total = principal + contribution * months;
      return `예상 자산: ${formatCurrency(total)}원`;
    }
    const effectiveMonthlyRate = (1 + annualRate / frequency) ** (frequency / 12) - 1;
    const growth = (1 + effectiveMonthlyRate) ** months;
    const futureValue =
      principal * growth +
      contribution * ((growth - 1) / effectiveMonthlyRate) * (1 + effectiveMonthlyRate);
    return `예상 자산: ${formatCurrency(futureValue)}원`;
  },
  loanSchedule(form) {
    const { rateUnit, amountUnit } = getUnitSettings();
    const principal = readValue(form, 'principal', amountUnit);
    const annualRate = (parseNumber(form.querySelector('[name="rate"]').value) * getRateMultiplier(rateUnit)) / 100;
    const months = parseNumber(form.querySelector('[name="months"]').value);
    const method = form.querySelector('[name="method"]').value;
    const monthlyRate = annualRate / 12;
    const rows = [];
    let balance = principal;
    let monthlyPayment = 0;

    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else if (method === 'equalPayment') {
      monthlyPayment =
        principal *
        (monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1);
    }

    for (let i = 1; i <= months; i += 1) {
      let interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      let principalPayment;
      let payment;

      if (method === 'equalPrincipal') {
        principalPayment = principal / months;
        payment = principalPayment + interest;
      } else {
        payment = monthlyRate === 0 ? monthlyPayment : monthlyPayment;
        principalPayment = payment - interest;
      }

      balance = Math.max(0, balance - principalPayment);
      rows.push({
        month: i,
        payment,
        principal: principalPayment,
        interest,
        balance,
      });
    }

    const totals = rows.reduce(
      (acc, row) => ({
        payment: acc.payment + row.payment,
        principal: acc.principal + row.principal,
        interest: acc.interest + row.interest,
      }),
      { payment: 0, principal: 0, interest: 0 }
    );

    const chartData = rows.map((row) => row.balance);
    const chartLabels = rows.map((row) => `${row.month}회차`);
    const monthlyPrincipalData = rows.map((row) => row.principal);
    const monthlyInterestData = rows.map((row) => row.interest);

    const tableHtml = `
      <table class="schedule-table">
        <thead>
          <tr>
            <th>회차</th>
            <th>월 상환액</th>
            <th>원금</th>
            <th>이자</th>
            <th>잔액</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td>${row.month}</td>
                  <td>${formatCurrency(row.payment)}</td>
                  <td>${formatCurrency(row.principal)}</td>
                  <td>${formatCurrency(row.interest)}</td>
                  <td>${formatCurrency(row.balance)}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;

    return {
      text: `총 ${months}개월 상환 스케줄이 생성되었습니다.`,
      tableHtml,
      totals,
      chart: {
        labels: chartLabels,
        data: chartData,
        monthlyPrincipal: monthlyPrincipalData,
        monthlyInterest: monthlyInterestData,
      },
    };
  },
};

const attachCalculatorHandlers = () => {
  const forms = Array.from(document.querySelectorAll('[data-calculator]'));
  const fieldLabels = {
    principal: '원금',
    rate: '이자율',
    months: '기간',
    loanPrincipal: '대출 원금',
    loanRate: '대출 이자율',
    loanMonths: '상환 기간',
    monthly: '월 납입액',
    savingsRate: '적금 이자율',
    savingsMonths: '적금 기간',
    base: '기준 값',
    percent: '퍼센트',
    amount: '금액',
    direction: '변환 방향',
    contribution: '월 추가 납입',
    years: '투자 기간',
    frequency: '복리 주기',
    method: '상환 방식',
  };

  document.querySelectorAll('[data-calculator]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let hasError = false;
      let firstInvalid = null;
      form.querySelectorAll('input[name], select[name], textarea[name]').forEach((field) => {
        const error = form.querySelector(`[data-error="${field.name}"]`);
        const isValid = field.checkValidity();
        field.classList.toggle('invalid', !isValid);
        if (error) {
          if (isValid) {
            error.textContent = '';
          } else {
            const label = fieldLabels[field.name] || '값';
            const { validity } = field;
            if (validity.valueMissing) {
              error.textContent = `${label}을(를) 입력해 주세요.`;
            } else if (validity.rangeUnderflow && field.min) {
              error.textContent = `${label}은(는) ${field.min} 이상이어야 합니다.`;
            } else if (validity.stepMismatch) {
              error.textContent = `${label} 형식을 확인해 주세요.`;
            } else {
              error.textContent = `${label}을(를) 올바르게 입력해 주세요.`;
            }
          }
        }
        if (!isValid) {
          hasError = true;
          if (!firstInvalid) {
            firstInvalid = field;
          }
        }
      });
      if (hasError) {
        firstInvalid?.focus();
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const type = form.dataset.calculator;
      const handler = calculators[type];
      if (!handler) return;
      const output = form.querySelector('.result');
      const result = handler(form);
      if (typeof result === 'string') {
        output.textContent = result;
      } else {
        output.textContent = result.text;
      }
      const tableTarget = form.querySelector('[data-schedule-table]');
      if (tableTarget) {
        tableTarget.innerHTML = result.tableHtml || '';
      }
      const chartTarget = form.querySelector('[data-schedule-chart]');
      if (chartTarget && result.chart) {
        if (chartTarget._chartInstance) {
          chartTarget._chartInstance.destroy();
        }
        if (window.Chart) {
          chartTarget._chartInstance = new window.Chart(chartTarget, {
            type: 'line',
            data: {
              labels: result.chart.labels,
              datasets: [
                {
                  label: '잔액 추이',
                  data: result.chart.data,
                  borderColor: '#2a6f5a',
                  backgroundColor: 'rgba(42, 111, 90, 0.12)',
                  tension: 0.3,
                  fill: false,
                  pointRadius: 2,
                  pointHoverRadius: 4,
                  stack: 'balance',
                  yAxisID: 'yBalance',
                },
                {
                  label: '월 원금',
                  data: result.chart.monthlyPrincipal,
                  borderColor: '#e3b04b',
                  backgroundColor: 'rgba(227, 176, 75, 0.18)',
                  tension: 0.3,
                  fill: true,
                  pointRadius: 0,
                  stack: 'paid',
                },
                {
                  label: '월 이자',
                  data: result.chart.monthlyInterest,
                  borderColor: '#8b5e3b',
                  backgroundColor: 'rgba(139, 94, 59, 0.14)',
                  tension: 0.3,
                  fill: true,
                  pointRadius: 0,
                  stack: 'paid',
                  yAxisID: 'yPaid',
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                },
                tooltip: {
                  callbacks: {
                    label(context) {
                      const value = Number(context.parsed.y || 0);
                      const label = context.dataset.label || '금액';
                      return `${label}: ${value.toLocaleString('ko-KR')}원`;
                    },
                  },
                },
              },
              scales: {
                yPaid: {
                  stacked: true,
                  position: 'left',
                  ticks: {
                    callback(value) {
                      const numeric = Number(value);
                      if (numeric >= 100000000) {
                        return `${(numeric / 100000000).toFixed(1)}억`;
                      }
                      if (numeric >= 10000) {
                        return `${(numeric / 10000).toFixed(0)}만`;
                      }
                      return `${numeric.toLocaleString('ko-KR')}원`;
                    },
                  },
                  title: {
                    display: true,
                    text: '금액(원)',
                  },
                },
                yBalance: {
                  position: 'right',
                  grid: {
                    drawOnChartArea: false,
                  },
                  ticks: {
                    callback(value) {
                      const numeric = Number(value);
                      if (numeric >= 100000000) {
                        return `${(numeric / 100000000).toFixed(1)}억`;
                      }
                      if (numeric >= 10000) {
                        return `${(numeric / 10000).toFixed(0)}만`;
                      }
                      return `${numeric.toLocaleString('ko-KR')}원`;
                    },
                  },
                  title: {
                    display: true,
                    text: '잔액(원)',
                  },
                },
                x: {
                  stacked: true,
                  title: {
                    display: true,
                    text: '회차',
                  },
                },
              },
            },
          });
        } else {
          chartTarget.parentElement.innerHTML = '<p class="hint">그래프를 표시하려면 Chart.js가 필요합니다.</p>';
        }
      }

      const summaryGrid = form.querySelector('[data-schedule-summary]');
      if (summaryGrid && result.totals) {
        const cards = summaryGrid.querySelectorAll('.result');
        if (cards.length >= 3) {
          cards[0].textContent = `${formatCurrency(result.totals.payment)}원`;
          cards[1].textContent = `${formatCurrency(result.totals.principal)}원`;
          cards[2].textContent = `${formatCurrency(result.totals.interest)}원`;
        }
      }

      const params = new URLSearchParams(window.location.search);
      form.querySelectorAll('input[name], select[name], textarea[name]').forEach((field) => {
        if (field.value !== '') {
          params.set(`${type}_${field.name}`, field.value);
        }
      });
      params.set('rateUnit', getUnitSettings().rateUnit);
      params.set('amountUnit', getUnitSettings().amountUnit);
      const cardId = form.closest('.card')?.id;
      const nextUrl = new URL(window.location.href);
      nextUrl.search = params.toString();
      if (cardId && !nextUrl.hash) {
        nextUrl.hash = cardId;
      }
      window.history.replaceState({}, '', nextUrl);
    });
  });
};

const restoreCalculatorValues = () => {
  const forms = document.querySelectorAll('[data-calculator]');
  if (!forms.length) return;

  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace('#', '');
  const rateParam = params.get('rateUnit');
  const amountParam = params.get('amountUnit');
  if (rateParam) localStorage.setItem('rateUnit', rateParam);
  if (amountParam) localStorage.setItem('amountUnit', amountParam);

  forms.forEach((form) => {
    const type = form.dataset.calculator;
    let hasAny = false;
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach((field) => {
      const key = `${type}_${field.name}`;
      if (params.has(key)) {
        field.value = params.get(key);
        hasAny = true;
      }
    });

    if (hasAny) {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
};

const attachResetHandler = () => {
  const resetButton = document.querySelector('[data-reset-params]');
  const modal = document.querySelector('[data-reset-modal]');
  const cancelButton = document.querySelector('[data-reset-cancel]');
  const confirmButton = document.querySelector('[data-reset-confirm]');
  if (!resetButton) return;

  let lastFocused = null;

  const getFocusable = () => {
    if (!modal) return [];
    return Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'));
  };

  const closeModal = () => {
    if (modal) modal.classList.remove('show');
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
    document.body.classList.remove('modal-open');
  };

  const openModal = () => {
    if (modal) modal.classList.add('show');
    lastFocused = document.activeElement;
    const focusable = getFocusable();
    if (focusable.length) {
      focusable[0].focus();
    }
    document.body.classList.add('modal-open');
  };

  const runReset = () => {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url);

    document.querySelectorAll('[data-calculator]').forEach((form) => {
      form.reset();
      const result = form.querySelector('.result');
      if (result) {
        result.textContent = '결과가 초기화되었습니다.';
      }
      const summaryGrid = form.querySelector('[data-schedule-summary]');
      if (summaryGrid) {
        summaryGrid.querySelectorAll('.result').forEach((item) => {
          item.textContent = '-';
        });
      }
      const tableTarget = form.querySelector('[data-schedule-table]');
      if (tableTarget) {
        tableTarget.innerHTML = '';
      }
      const chartTarget = form.querySelector('[data-schedule-chart]');
      if (chartTarget && chartTarget._chartInstance) {
        chartTarget._chartInstance.destroy();
        chartTarget._chartInstance = null;
      }
    });
  };

  resetButton.addEventListener('click', openModal);
  if (cancelButton) {
    cancelButton.addEventListener('click', closeModal);
  }
  if (confirmButton) {
    confirmButton.addEventListener('click', () => {
      runReset();
      closeModal();
    });
  }
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }
    if (event.key === 'Tab' && modal && modal.classList.contains('show')) {
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
};

const attachShareHandlers = () => {
  const toast = document.getElementById('toast');
  let toastTimer;
  const showToast = (message, isError = false) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('fail', isError);
    toast.classList.add('show');
    if (isError) {
      toast.classList.add('shake');
    }
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.remove('shake');
    }, 2000);
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.style.position = 'fixed';
    tempInput.style.opacity = '0';
    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
  };

  document.querySelectorAll('[data-share]').forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.dataset.share;
      const url = new URL(window.location.href);
      if (targetId) {
        url.hash = targetId;
      }
      const status = button.parentElement.querySelector('[data-share-status]');
      try {
        await copyText(url.toString());
        if (status) {
          status.textContent = '링크가 복사되었습니다.';
          window.setTimeout(() => {
            status.textContent = '';
          }, 2000);
        }
        showToast('링크가 복사되었습니다.');
        button.classList.add('done');
        button.classList.remove('fail');
        window.setTimeout(() => {
          button.classList.remove('done');
        }, 2000);
      } catch (error) {
        if (status) {
          status.textContent = '복사에 실패했습니다. 직접 복사해 주세요.';
          window.setTimeout(() => {
            status.textContent = '';
          }, 2000);
        }
        showToast('복사에 실패했습니다.', true);
        button.classList.add('fail');
        button.classList.remove('done');
        window.setTimeout(() => {
          button.classList.remove('fail');
          button.classList.remove('done');
        }, 2000);
      }
    });
  });
};

const attachAutoCalc = () => {
  const toggle = document.querySelector('[data-auto-calc]');
  if (!toggle) return;

  const STORAGE_KEY = 'autoCalc';
  toggle.checked = localStorage.getItem(STORAGE_KEY) === 'true';

  const toast = document.getElementById('toast');
  let toastTimer;
  const showAutoToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('fail');
    toast.classList.add('auto');
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.remove('auto');
    }, 1200);
  };

  toggle.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY, toggle.checked ? 'true' : 'false');
  });

  document.querySelectorAll('[data-calculator]').forEach((form) => {
    let timer;
    const trigger = () => {
      if (!toggle.checked) return;
      window.clearTimeout(timer);
      showAutoToast('자동 계산 중...');
      timer = window.setTimeout(() => {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        form.querySelectorAll('input[name]').forEach((input) => {
          if (!moneyFields.has(input.name)) return;
          if (document.activeElement === input) return;
          input.dispatchEvent(new Event('blur'));
        });
      }, 350);
    };

    form.querySelectorAll('input[name], select[name], textarea[name]').forEach((field) => {
      field.addEventListener('input', trigger);
      field.addEventListener('change', trigger);
    });
  });
};

const attachInputFormatting = () => {
  const formatNumber = (value) => {
    const numeric = parseNumber(value);
    if (!Number.isFinite(numeric)) return '';
    return numeric.toLocaleString('ko-KR');
  };

  document.querySelectorAll('[data-calculator] input[name]').forEach((input) => {
    if (!moneyFields.has(input.name)) return;
    input.addEventListener('focus', () => {
      input.value = String(input.value).replace(/,/g, '');
    });
    input.addEventListener('blur', () => {
      if (input.value === '') return;
      input.value = formatNumber(input.value);
    });
    input.addEventListener('input', () => {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const raw = input.value.replace(/,/g, '');
      const formatted = formatNumber(raw);
      if (formatted) {
        input.value = formatted;
        const diff = formatted.length - raw.length;
        const nextPos = Math.max(0, Math.min(formatted.length, (start ?? formatted.length) + diff));
        input.setSelectionRange(nextPos, nextPos);
      }
    });
  });
};

const attachUnitToggles = () => {
  const rateSelect = document.querySelector('[data-rate-unit]');
  const amountSelect = document.querySelector('[data-amount-unit]');
  let currentAmountUnit = localStorage.getItem('amountUnit') || 'krw';
  let currentRateUnit = localStorage.getItem('rateUnit') || 'annual';
  const recalcAll = () => {
    document.querySelectorAll('[data-calculator]').forEach((form) => {
      const hasValue = Array.from(
        form.querySelectorAll('input[name], select[name], textarea[name]')
      ).some((field) => field.value !== '');
      if (hasValue) {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  };
  if (rateSelect) {
    rateSelect.value = currentRateUnit;
    rateSelect.addEventListener('change', () => {
      const nextUnit = rateSelect.value;
      if (nextUnit !== currentRateUnit) {
        const factor = nextUnit === 'monthly' ? 1 / 12 : 12;
        document
          .querySelectorAll('[data-calculator] input[name]')
          .forEach((input) => {
            if (!rateFields.has(input.name)) return;
            const value = parseNumber(input.value);
            if (Number.isNaN(value) || input.value === '') return;
            const converted = value * factor;
            if (!Number.isFinite(converted)) return;
            input.value = (Math.round(converted * 100) / 100).toString();
          });
        currentRateUnit = nextUnit;
        recalcAll();
      }
      localStorage.setItem('rateUnit', nextUnit);
    });
  }
  if (amountSelect) {
    amountSelect.value = currentAmountUnit;
    amountSelect.addEventListener('change', () => {
      const nextUnit = amountSelect.value;
      if (nextUnit !== currentAmountUnit) {
        const factor = nextUnit === 'thousand' ? 0.001 : 1000;
        document
          .querySelectorAll('[data-calculator] input[name]')
          .forEach((input) => {
            if (!moneyFields.has(input.name)) return;
            const value = parseNumber(input.value);
            if (Number.isNaN(value) || input.value === '') return;
            const converted = value * factor;
            if (!Number.isFinite(converted)) return;
            if (nextUnit === 'thousand') {
              input.value = (Math.round(converted * 10) / 10).toString();
            } else {
              input.value = Math.round(converted).toString();
            }
          });
        currentAmountUnit = nextUnit;
        recalcAll();
      }
      localStorage.setItem('amountUnit', nextUnit);
    });
  }
};

const run = () => {
  updateActiveNav();
  attachCalculatorHandlers();
  attachShareHandlers();
  restoreCalculatorValues();
  attachResetHandler();
  attachAutoCalc();
  attachInputFormatting();
  attachUnitToggles();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run);
} else {
  run();
}
