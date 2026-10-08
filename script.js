const GLOBAL_AVG_TONS = 4.7;
const HIGH_INCOME_AVG_TONS = 10.4;

// Emission factors matching the backend
const EMISSION_FACTORS = {
    electricity_per_kwh: 0.4,
    cooking_fuel_yearly: { lpg: 600, electricity: 0, wood: 800 },
    car_per_km: { petrol: 0.192, diesel: 0.171, hybrid: 0.105, electric: 0.053 },
    public_transport_per_km: 0.04,
    flight_short_haul: 250,
    diet_yearly: {
        meat_heavy: 4.5 * 365,
        average: 3.3 * 365,
        vegetarian: 2.0 * 365,
        vegan: 1.5 * 365
    },
    waste_yearly: { never: 500, sometimes: 300, always: 100 }
};

const app = {
    currentStep: 1,
    maxSteps: 3,
    chartInstances: {},
    
    init() {
        if (localStorage.getItem('ecoTrackData')) {
            const prevAlert = document.getElementById('previous-data-alert');
            if (prevAlert) prevAlert.style.display = 'block';
        }
        
        const form = document.getElementById('calculator-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.calculateAndShowResults();
            });
        }

        const dietRadios = document.querySelectorAll('input[name="diet"]');
        dietRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.radio-card').forEach(card => card.classList.remove('selected'));
                if (radio.checked) {
                    radio.parentElement.classList.add('selected');
                }
            });
        });
    },

    // Client-side instant fallback calculation
    calculateLocally(data) {
        const elec_kwh = parseFloat(data.electricity) || 0;
        const fuel_type = data.cooking_fuel || 'electricity';
        const car_km = parseFloat(data.car_distance) || 0;
        const car_type = data.car_type || 'petrol';
        const pub_km = parseFloat(data.public_transport) || 0;
        const flights = parseFloat(data.flights) || 0;
        const diet = data.diet || 'average';
        const waste = data.recycling || 'sometimes';

        const energy_val = (elec_kwh * 12 * EMISSION_FACTORS.electricity_per_kwh) + (EMISSION_FACTORS.cooking_fuel_yearly[fuel_type] || 0);
        const transport_val = (car_km * 12 * (EMISSION_FACTORS.car_per_km[car_type] || 0)) + 
                            (pub_km * 12 * EMISSION_FACTORS.public_transport_per_km) + 
                            (flights * EMISSION_FACTORS.flight_short_haul);
        const diet_val = EMISSION_FACTORS.diet_yearly[diet] || 1204.5;
        const waste_val = EMISSION_FACTORS.waste_yearly[waste] || 300;

        const total_kg = energy_val + transport_val + diet_val + waste_val;

        return {
            totalTons: +(total_kg / 1000).toFixed(2),
            breakdown: {
                energy: +(energy_val / 1000).toFixed(2),
                transport: +(transport_val / 1000).toFixed(2),
                diet: +(diet_val / 1000).toFixed(2),
                waste: +(waste_val / 1000).toFixed(2)
            }
        };
    },

    async calculateAndShowResults() {
        const dietInput = document.querySelector('input[name="diet"]:checked');
        const formData = {
            electricity: document.getElementById('electricity')?.value || '0',
            cooking_fuel: document.getElementById('cooking_fuel')?.value || 'electricity',
            car_distance: document.getElementById('car_distance')?.value || '0',
            car_type: document.getElementById('car_type')?.value || 'petrol',
            public_transport: document.getElementById('public_transport')?.value || '0',
            flights: document.getElementById('flights')?.value || '0',
            diet: dietInput ? dietInput.value : 'average',
            recycling: document.getElementById('recycling')?.value || 'sometimes'
        };

        const btnSubmit = document.getElementById('btn-submit');
        const originalBtnText = btnSubmit ? btnSubmit.innerHTML : '';
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Calculating...';
        }

        let payload = null;

        // Try server endpoint (works on Vercel deployment and local server)
        const isFileProtocol = window.location.protocol === 'file:';
        const endpoints = isFileProtocol 
            ? ['http://127.0.0.1:5000/calculate'] 
            : ['/api/calculate', '/calculate', 'http://127.0.0.1:5000/calculate'];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    payload = await response.json();
                    break;
                }
            } catch (err) {
                // Continue trying next endpoint or fallback
            }
        }

        // Fallback to client-side computation if API is unreachable
        if (!payload) {
            payload = this.calculateLocally(formData);
        }

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }

        localStorage.setItem('ecoTrackData', JSON.stringify(payload));
        this.renderDashboard(payload);
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    startWizard() {
        this.currentStep = 1;
        this.updateWizardUI();
        this.showScreen('wizard-screen');
    },

    nextStep() {
        if (!this.validateStep()) return;
        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateWizardUI();
        }
    },

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateWizardUI();
        }
    },

    validateStep() {
        const stepDiv = document.querySelector(`.wizard-step[data-step="${this.currentStep}"]`);
        if (!stepDiv) return true;
        const inputs = stepDiv.querySelectorAll('input[required], select[required]');
        let valid = true;
        inputs.forEach(input => {
            if (!input.value) {
                valid = false;
                input.style.borderColor = 'var(--accent-color, #ff7b72)';
                setTimeout(() => input.style.borderColor = '', 2000);
            }
        });
        return valid;
    },

    updateWizardUI() {
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
        const currentStepEl = document.querySelector(`.wizard-step[data-step="${this.currentStep}"]`);
        if (currentStepEl) currentStepEl.classList.add('active');

        const stepCountEl = document.getElementById('current-step');
        if (stepCountEl) stepCountEl.innerText = this.currentStep;

        const progressFill = document.getElementById('progress-fill');
        if (progressFill) progressFill.style.width = `${(this.currentStep / this.maxSteps) * 100}%`;

        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnSubmit = document.getElementById('btn-submit');

        if (btnPrev) btnPrev.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
        
        if (this.currentStep === this.maxSteps) {
            if (btnNext) btnNext.style.display = 'none';
            if (btnSubmit) btnSubmit.style.display = 'inline-flex';
        } else {
            if (btnNext) btnNext.style.display = 'inline-flex';
            if (btnSubmit) btnSubmit.style.display = 'none';
        }
    },

    showResults() {
        const data = JSON.parse(localStorage.getItem('ecoTrackData'));
        if (data) this.renderDashboard(data);
    },

    renderDashboard(data) {
        this.showScreen('results-screen');
        
        const totalCo2El = document.getElementById('total-co2');
        if (totalCo2El) totalCo2El.innerText = data.totalTons;

        const badgeElem = document.getElementById('emission-badge');
        if (badgeElem) {
            const tons = parseFloat(data.totalTons);
            if (tons <= 3) {
                badgeElem.innerText = "Excellent ✨";
                badgeElem.className = "badge success";
            } else if (tons <= GLOBAL_AVG_TONS * 1.5) {
                badgeElem.innerText = "Average 📊";
                badgeElem.className = "badge warning";
            } else {
                badgeElem.innerText = "High Impact ⚠️";
                badgeElem.className = "badge danger";
            }
        }

        this.renderCharts(data);
        this.generateTips(data.breakdown);
    },

    renderCharts(data) {
        if (typeof Chart === 'undefined') return;

        if (this.chartInstances.category) this.chartInstances.category.destroy();
        if (this.chartInstances.comparison) this.chartInstances.comparison.destroy();

        Chart.defaults.color = '#8b949e';
        Chart.defaults.font.family = "'Outfit', sans-serif";

        const catCanvas = document.getElementById('categoryChart');
        if (catCanvas) {
            const ctxCat = catCanvas.getContext('2d');
            this.chartInstances.category = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: ['Energy', 'Transport', 'Diet', 'Waste'],
                    datasets: [{
                        data: [
                            data.breakdown?.energy ?? 0,
                            data.breakdown?.transport ?? 0,
                            data.breakdown?.diet ?? 0,
                            data.breakdown?.waste ?? 0
                        ],
                        backgroundColor: ['#d29922', '#1f6feb', '#2ea043', '#ff7b72'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }

        const compCanvas = document.getElementById('comparisonChart');
        if (compCanvas) {
            const ctxComp = compCanvas.getContext('2d');
            this.chartInstances.comparison = new Chart(ctxComp, {
                type: 'bar',
                data: {
                    labels: ['You', 'Global Avg', 'High-Income Avg'],
                    datasets: [{
                        label: 'Tons CO₂e / Year',
                        data: [data.totalTons, GLOBAL_AVG_TONS, HIGH_INCOME_AVG_TONS],
                        backgroundColor: [
                            parseFloat(data.totalTons) > GLOBAL_AVG_TONS ? '#ff7b72' : '#2ea043',
                            'rgba(139, 148, 158, 0.4)',
                            'rgba(139, 148, 158, 0.2)'
                        ],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    },

    generateTips(breakdown = {}) {
        const tipsContainer = document.getElementById('tips-list');
        if (!tipsContainer) return;

        tipsContainer.innerHTML = ''; 
        const tips = [];

        if (parseFloat(breakdown.energy || 0) > 1.5) {
            tips.push({ icon: 'fa-bolt', title: 'Optimize Household Energy', desc: 'Your energy carbon footprint is high. Consider switching to LED bulbs, unplugging idle devices, or checking your home insulation.' });
        }
        if (parseFloat(breakdown.transport || 0) > 2.0) {
            tips.push({ icon: 'fa-car', title: 'Rethink Transportation', desc: 'Transport is a major factor for you. Try organizing a carpool, mapping out public transit routes, or replacing short drives with cycling.' });
        }
        if (parseFloat(breakdown.diet || 0) > 1.5) {
            tips.push({ icon: 'fa-utensils', title: 'Incorporate Plant-Based Meals', desc: 'Meat-heavy diets have a large ecological footprint. Try "Meatless Mondays" to significantly reduce your CO2 emissions over the year.' });
        }
        if (parseFloat(breakdown.waste || 0) > 0.3) {
            tips.push({ icon: 'fa-recycle', title: 'Improve Recycling Habits', desc: 'A significant portion of your footprint comes from waste. Separating recyclables and composting organic waste can reduce this to near zero.' });
        }
        if (tips.length === 0) {
            tips.push({ icon: 'fa-seedling', title: 'Keep Up the Great Work!', desc: 'Your emissions are below average! Support local eco-friendly projects or offset what remaining footprint you have to become carbon neutral.' });
        }

        tips.forEach(t => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fa-solid ${t.icon}"></i>
                <div class="tip-content">
                    <h4>${t.title}</h4>
                    <p>${t.desc}</p>
                </div>
            `;
            tipsContainer.appendChild(li);
        });
    },

    retake() {
        this.showScreen('welcome-screen');
        const form = document.getElementById('calculator-form');
        if (form) form.reset();
        const carVal = document.getElementById('car-val');
        if (carVal) carVal.textContent = "0 km";
        const ptVal = document.getElementById('pt-val');
        if (ptVal) ptVal.textContent = "0 km";
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});