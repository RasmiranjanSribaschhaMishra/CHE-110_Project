const GLOBAL_AVG_TONS = 4.7;
const HIGH_INCOME_AVG_TONS = 10.4;

const app = {
    currentStep: 1,
    maxSteps: 3,
    chartInstances: {},
    
    init() {
        if (localStorage.getItem('ecoTrackData')) {
            document.getElementById('previous-data-alert').style.display = 'block';
        }
        
        document.getElementById('calculator-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.calculateAndShowResults();
        });

        const dietRadios = document.querySelectorAll('input[name="diet"]');
        dietRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.radio-card').forEach(card => card.classList.remove('selected'));
                if(radio.checked) {
                    radio.parentElement.classList.add('selected');
                }
            });
        });
    },

    async calculateAndShowResults() {
        const formData = {
            electricity: document.getElementById('electricity').value,
            cooking_fuel: document.getElementById('cooking_fuel').value,
            car_distance: document.getElementById('car_distance').value,
            car_type: document.getElementById('car_type').value,
            public_transport: document.getElementById('public_transport').value,
            flights: document.getElementById('flights').value,
            diet: document.querySelector('input[name="diet"]:checked').value,
            recycling: document.getElementById('recycling').value
        };

        try {
            // Talk to Python Backend
            const response = await fetch('http://127.0.0.1:5000/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Network response was not ok');

            const payload = await response.json();
            localStorage.setItem('ecoTrackData', JSON.stringify(payload));
            this.renderDashboard(payload);

        } catch (error) {
            console.error('Error:', error);
            alert("Connection Failed: Ensure your VS Code terminal is running 'python app.py'!");
        }
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
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
        const inputs = stepDiv.querySelectorAll('input[required], select[required]');
        let valid = true;
        inputs.forEach(input => {
            if (!input.value) {
                valid = false;
                input.style.borderColor = 'var(--accent-color)';
                setTimeout(() => input.style.borderColor = 'var(--border-color)', 2000);
            }
        });
        return valid;
    },

    updateWizardUI() {
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
        document.querySelector(`.wizard-step[data-step="${this.currentStep}"]`).classList.add('active');

        document.getElementById('current-step').innerText = this.currentStep;
        document.getElementById('progress-fill').style.width = `${(this.currentStep / this.maxSteps) * 100}%`;

        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        const btnSubmit = document.getElementById('btn-submit');

        btnPrev.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
        
        if (this.currentStep === this.maxSteps) {
            btnNext.style.display = 'none';
            btnSubmit.style.display = 'inline-flex';
        } else {
            btnNext.style.display = 'inline-flex';
            btnSubmit.style.display = 'none';
        }
    },

    showResults() {
        const data = JSON.parse(localStorage.getItem('ecoTrackData'));
        if(data) this.renderDashboard(data);
    },

    renderDashboard(data) {
        this.showScreen('results-screen');
        
        document.getElementById('total-co2').innerText = data.totalTons;
        const badgeElem = document.getElementById('emission-badge');
        
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

        this.renderCharts(data);
        this.generateTips(data.breakdown);
    },

    renderCharts(data) {
        if (this.chartInstances.category) this.chartInstances.category.destroy();
        if (this.chartInstances.comparison) this.chartInstances.comparison.destroy();

        Chart.defaults.color = '#8b949e';
        Chart.defaults.font.family = "'Outfit', sans-serif";

        // RESTORED: Full Doughnut Chart Options
        const ctxCat = document.getElementById('categoryChart').getContext('2d');
        this.chartInstances.category = new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: ['Energy', 'Transport', 'Diet', 'Waste'],
                datasets: [{
                    data: [data.breakdown.energy, data.breakdown.transport, data.breakdown.diet, data.breakdown.waste],
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

        // RESTORED: Full Bar Chart Generation
        const ctxComp = document.getElementById('comparisonChart').getContext('2d');
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
    },

    generateTips(breakdown) {
        const tipsContainer = document.getElementById('tips-list');
        tipsContainer.innerHTML = ''; 

        const tips = [];

        // RESTORED: Detailed logic for tips based on specific thresholds
        if (parseFloat(breakdown.energy) > 1.5) {
            tips.push({ icon: 'fa-bolt', title: 'Optimize Household Energy', desc: 'Your energy carbon footprint is high. Consider switching to LED bulbs, unplugging idle devices, or checking your home insulation.' });
        }
        if (parseFloat(breakdown.transport) > 2.0) {
            tips.push({ icon: 'fa-car', title: 'Rethink Transportation', desc: 'Transport is a major factor for you. Try organizing a carpool, mapping out public transit routes, or replacing short drives with cycling.' });
        }
        if (parseFloat(breakdown.diet) > 1.5) {
            tips.push({ icon: 'fa-utensils', title: 'Incorporate Plant-Based Meals', desc: 'Meat-heavy diets have a large ecological footprint. Try "Meatless Mondays" to significantly reduce your CO2 emissions over the year.' });
        }
        if (parseFloat(breakdown.waste) > 0.3) {
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
        document.getElementById('calculator-form').reset();
        document.getElementById('car-val').textContent = "0 km";
        document.getElementById('pt-val').textContent = "0 km";
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});