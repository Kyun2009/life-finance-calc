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
  exchange(form) {
    const amount = Number(form.querySelector('[name="amount"]').value);
    const rate = Number(form.querySelector('[name="rate"]').value);
    const direction = form.querySelector('[name="direction"]').value;
    if (rate === 0) {
      return '환율은 0보다 커야 합니다.';
    }
    const result = direction === 'toKrw' ? amount * rate : amount / rate;
    const suffix = direction === 'toKrw' ? '원' : '외화';
    return `환산 금액: ${formatCurrency(result)}${suffix}`;
  },
  compound(form) {
    const principal = Number(form.querySelector('[name="principal"]').value);
    const contribution = Number(form.querySelector('[name="contribution"]').value);
    const annualRate = Number(form.querySelector('[name="rate"]').value) / 100;
    const years = Number(form.querySelector('[name="years"]').value);
    const frequency = Number(form.querySelector('[name="frequency"]').value);
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
    const principal = Number(form.querySelector('[name="principal"]').value);
    const annualRate = Number(form.querySelector('[name="rate"]').value) / 100;
    const months = Number(form.querySelector('[name="months"]').value);
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
  document.querySelectorAll('[data-calculator]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
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
