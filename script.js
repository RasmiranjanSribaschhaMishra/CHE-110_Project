/**
 * EcoTrack Pro — Carbon Intelligence Engine & Interactive Controller
 * Author: Rasmiranjan Sribaschha Mishra
 * CHE-110 Environmental Engineering Project
 */

// Lifecycle Emission Factors for Instant Client-Side Evaluation
const CLIENT_EMISSION_FACTORS = {
    electricity_per_kwh: 0.72,
    renewable_reduction: 0.85,
    cooking_fuel_yearly: { lpg: 580.0, electricity: 240.0, wood: 880.0, biogas: 80.0, induction_solar: 30.0 },
    car_per_km: { petrol: 0.192, diesel: 0.171, cng: 0.135, hybrid: 0.095, electric: 0.045 },
    two_wheeler_per_km: { petrol: 0.065, electric: 0.015, none: 0.0 },
    public_transport_per_km: { bus: 0.054, metro_train: 0.028, shared_auto: 0.040 },
    flight_short_haul: 180.0,
    flight_long_haul: 650.0,
    diet_yearly: { meat_heavy: 1204.5, average_omnivore: 912.5, pescatarian: 693.5, vegetarian: 547.5, vegan: 401.5 },
    food_waste_factor: { high: 350.0, moderate: 180.0, minimal: 40.0 },
    shopping_lifestyle_yearly: { frequent: 650.0, moderate: 320.0, minimalist: 110.0 },
    waste_management_yearly: { never: 420.0, sometimes: 220.0, always_compost: 60.0 }
};

const BENCHMARK_TARGETS = {
    paris_target_2030: 2.0,
    india: 2.1,
    global_avg: 4.7,
    eu_avg: 6.8,
    china: 8.0,
    usa: 14.9
};

const PERSONA_PRESETS = {
    student: {
        electricity: 120,
        cooking_fuel: 'electricity',
        solar_percentage: 0,
        car_distance: 0,
        car_type: 'petrol',
        bike_distance: 40,
        bike_type: 'none',
        bus_distance: 120,
        metro_distance: 150,
        flights_short: 0,
        flights_long: 0,
        diet: 'vegetarian',
        food_waste: 'minimal',
        recycling: 'sometimes',
        shopping_habit: 'minimalist'
    },
    professional: {
        electricity: 280,
        cooking_fuel: 'lpg',
        solar_percentage: 10,
        car_distance: 250,
        car_type: 'petrol',
        bike_distance: 80,
        bike_type: 'petrol',
        bus_distance: 60,
        metro_distance: 80,
        flights_short: 2,
        flights_long: 1,
        diet: 'average_omnivore',
        food_waste: 'moderate',
        recycling: 'sometimes',
        shopping_habit: 'moderate'
    },
    frequent_flyer: {
        electricity: 550,
        cooking_fuel: 'lpg',
        solar_percentage: 0,
        car_distance: 600,
        car_type: 'diesel',
        bike_distance: 0,
        bike_type: 'none',
        bus_distance: 20,
        metro_distance: 30,
        flights_short: 6,
        flights_long: 3,
        diet: 'meat_heavy',
        food_waste: 'high',
        recycling: 'never',
        shopping_habit: 'frequent'
    },
    eco_hero: {
        electricity: 180,
        cooking_fuel: 'induction_solar',
        solar_percentage: 100,
        car_distance: 100,
        car_type: 'electric',
        bike_distance: 120,
        bike_type: 'electric',
        bus_distance: 150,
        metro_distance: 200,
        flights_short: 0,
        flights_long: 0,
        diet: 'vegan',
        food_waste: 'minimal',
        recycling: 'always_compost',
        shopping_habit: 'minimalist'
    }
};

const app = {
    currentStep: 1,
    maxSteps: 4,
    chartInstances: {},
    lastCalculatedData: null,

    init() {
        this.setupDietCardListeners();
        this.updateWizardUI();
        this.checkApiHealth();
        this.initSimulator();
    },

    // Switch Navbar Tabs
    switchTab(tabId) {
        document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

        const targetPane = document.getElementById(tabId);
        if (targetPane) targetPane.classList.add('active');

        const activeBtn = document.querySelector(`.nav-tab[onclick*="${tabId}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        if (tabId === 'simulator-view') {
            this.updateSimulator();
        }
    },

    // Check API Health
    async checkApiHealth() {
        const pill = document.getElementById('apiStatusPill');
        if (!pill) return;

        try {
            const isFile = window.location.protocol === 'file:';
            const endpoint = isFile ? 'http://127.0.0.1:5000/api/calculate' : '/api/calculate';
            const res = await fetch(endpoint, { method: 'GET' });
            if (res.ok) {
                pill.innerHTML = `<span class="status-dot"></span><span class="status-text">Serverless API Active</span>`;
                pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            }
        } catch (e) {
            pill.innerHTML = `<span class="status-dot" style="background:#06B6D4;box-shadow:0 0 10px #06B6D4"></span><span class="status-text">Local Client Mode</span>`;
        }
    },

    // Diet Selection Card UI sync
    setupDietCardListeners() {
        const dietRadios = document.querySelectorAll('input[name="diet"]');
        dietRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                document.querySelectorAll('.diet-card').forEach(card => card.classList.remove('selected'));
                if (radio.checked) {
                    radio.closest('.diet-card').classList.add('selected');
                }
            });
        });
    },

    // Apply Presets
    applyPreset(presetKey) {
        const preset = PERSONA_PRESETS[presetKey];
        if (!preset) return;

        for (const [key, val] of Object.entries(preset)) {
            if (key === 'diet') {
                const radio = document.querySelector(`input[name="diet"][value="${val}"]`);
                if (radio) {
                    radio.checked = true;
                    document.querySelectorAll('.diet-card').forEach(card => card.classList.remove('selected'));
                    radio.closest('.diet-card').classList.add('selected');
                }
            } else if (key === 'solar_percentage') {
                const slider = document.getElementById('solar_percentage');
                if (slider) {
                    slider.value = val;
                    document.getElementById('solarDisplay').innerText = val + '%';
                }
            } else {
                const input = document.getElementById(key);
                if (input) input.value = val;
            }
        }

        // Auto calculate
        this.submitCalculation();
    },

    // Step Navigation
    nextStep() {
        if (!this.validateCurrentStep()) return;
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

    validateCurrentStep() {
        const currentPane = document.querySelector(`.wizard-step-pane[data-step="${this.currentStep}"]`);
        if (!currentPane) return true;
        const requiredInputs = currentPane.querySelectorAll('input[required], select[required]');
        let valid = true;
        requiredInputs.forEach(input => {
            if (!input.value) {
                valid = false;
                input.style.borderColor = 'var(--rose)';
                setTimeout(() => input.style.borderColor = '', 2000);
            }
        });
        return valid;
    },

    updateWizardUI() {
        document.querySelectorAll('.wizard-step-pane').forEach(pane => pane.classList.remove('active'));
        const activePane = document.querySelector(`.wizard-step-pane[data-step="${this.currentStep}"]`);
        if (activePane) activePane.classList.add('active');

        document.querySelectorAll('.step-bullet').forEach((bullet, index) => {
            const stepNum = index + 1;
            bullet.classList.remove('active', 'completed');
            if (stepNum === this.currentStep) {
                bullet.classList.add('active');
            } else if (stepNum < this.currentStep) {
                bullet.classList.add('completed');
            }
        });

        const progressPercent = (this.currentStep / this.maxSteps) * 100;
        const progressFill = document.getElementById('wizardProgressFill');
        if (progressFill) progressFill.style.width = `${progressPercent}%`;

        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        const btnCalculate = document.getElementById('btnCalculate');

        if (btnPrev) btnPrev.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';

        if (this.currentStep === this.maxSteps) {
            if (btnNext) btnNext.style.display = 'none';
            if (btnCalculate) btnCalculate.style.display = 'inline-flex';
        } else {
            if (btnNext) btnNext.style.display = 'inline-flex';
            if (btnCalculate) btnCalculate.style.display = 'none';
        }
    },

    resetForm() {
        const form = document.getElementById('footprintForm');
        if (form) form.reset();
        document.getElementById('solarDisplay').innerText = '0%';
        this.applyPreset('student');
        this.currentStep = 1;
        this.updateWizardUI();
    },

    // Extract Form Data
    getFormData() {
        const dietInput = document.querySelector('input[name="diet"]:checked');
        return {
            electricity: parseFloat(document.getElementById('electricity')?.value || 0),
            cooking_fuel: document.getElementById('cooking_fuel')?.value || 'lpg',
            solar_percentage: parseFloat(document.getElementById('solar_percentage')?.value || 0),
            car_distance: parseFloat(document.getElementById('car_distance')?.value || 0),
            car_type: document.getElementById('car_type')?.value || 'petrol',
            bike_distance: parseFloat(document.getElementById('bike_distance')?.value || 0),
            bike_type: document.getElementById('bike_type')?.value || 'none',
            bus_distance: parseFloat(document.getElementById('bus_distance')?.value || 0),
            metro_distance: parseFloat(document.getElementById('metro_distance')?.value || 0),
            flights_short: parseFloat(document.getElementById('flights_short')?.value || 0),
            flights_long: parseFloat(document.getElementById('flights_long')?.value || 0),
            diet: dietInput ? dietInput.value : 'average_omnivore',
            food_waste: document.getElementById('food_waste')?.value || 'moderate',
            recycling: document.getElementById('recycling')?.value || 'sometimes',
            shopping_habit: document.getElementById('shopping_habit')?.value || 'moderate'
        };
    },

    // Client-side Computation Fallback Engine
    calculateLocally(data) {
        const solar_pct = Math.min(100, Math.max(0, data.solar_percentage || 0)) / 100.0;
        const effective_elec_factor = CLIENT_EMISSION_FACTORS.electricity_per_kwh * (1.0 - (solar_pct * CLIENT_EMISSION_FACTORS.renewable_reduction));
        
        const elec_kg = (data.electricity * 12 * effective_elec_factor);
        const fuel_kg = CLIENT_EMISSION_FACTORS.cooking_fuel_yearly[data.cooking_fuel] || 240.0;
        const energy_val = elec_kg + fuel_kg;

        const car_kg = (data.car_distance * 12 * (CLIENT_EMISSION_FACTORS.car_per_km[data.car_type] || 0.192));
        const bike_kg = (data.bike_distance * 12 * (CLIENT_EMISSION_FACTORS.two_wheeler_per_km[data.bike_type] || 0.0));
        const transit_kg = (data.bus_distance * 12 * CLIENT_EMISSION_FACTORS.public_transport_per_km.bus) + 
                           (data.metro_distance * 12 * CLIENT_EMISSION_FACTORS.public_transport_per_km.metro_train);
        const flight_kg = (data.flights_short * CLIENT_EMISSION_FACTORS.flight_short_haul) + (data.flights_long * CLIENT_EMISSION_FACTORS.flight_long_haul);
        const transport_val = car_kg + bike_kg + transit_kg + flight_kg;

        const diet_base_kg = CLIENT_EMISSION_FACTORS.diet_yearly[data.diet] || 912.5;
        const food_waste_kg = CLIENT_EMISSION_FACTORS.food_waste_factor[data.food_waste] || 180.0;
        const diet_val = diet_base_kg + food_waste_kg;

        const waste_kg = CLIENT_EMISSION_FACTORS.waste_management_yearly[data.recycling] || 220.0;
        const shopping_kg = CLIENT_EMISSION_FACTORS.shopping_lifestyle_yearly[data.shopping_habit] || 320.0;
        const waste_val = waste_kg + shopping_kg;

        const total_kg = energy_val + transport_val + diet_val + waste_val;
        const total_tons = +(total_kg / 1000.0).toFixed(2);
        const trees_needed = Math.round(total_kg / 22.0);

        let grade = "B (Global Average)";
        let badge_class = "grade-b";
        if (total_tons <= 2.0) { grade = "A+ (Climate Hero)"; badge_class = "grade-aplus"; }
        else if (total_tons <= 3.5) { grade = "A (Eco Conscious)"; badge_class = "grade-a"; }
        else if (total_tons <= 5.0) { grade = "B (Global Average)"; badge_class = "grade-b"; }
        else if (total_tons <= 8.0) { grade = "C (Moderate Impact)"; badge_class = "grade-c"; }
        else { grade = "D (High Footprint)"; badge_class = "grade-d"; }

        return {
            totalTons: total_tons,
            totalKg: Math.round(total_kg),
            grade: grade,
            badgeClass: badge_class,
            treesNeeded: trees_needed,
            breakdown: {
                energy: +(energy_val / 1000.0).toFixed(2),
                transport: +(transport_val / 1000.0).toFixed(2),
                diet: +(diet_val / 1000.0).toFixed(2),
                waste: +(waste_val / 1000.0).toFixed(2)
            },
            detailedBreakdown: {
                electricityKg: Math.round(elec_kg),
                cookingFuelKg: Math.round(fuel_kg),
                carKg: Math.round(car_kg),
                bikeKg: Math.round(bike_kg),
                publicTransitKg: Math.round(transit_kg),
                flightsKg: Math.round(flight_kg),
                dietKg: Math.round(diet_base_kg),
                foodWasteKg: Math.round(food_waste_kg),
                lifestyleKg: Math.round(shopping_kg),
                wasteKg: Math.round(waste_kg)
            },
            benchmarks: BENCHMARK_TARGETS,
            actionPlan: [
                { category: 'Energy', title: 'Solar & LED Optimization', impact_tons: +(energy_val * 0.4 / 1000.0).toFixed(2), difficulty: 'Medium', action: 'Adopt rooftop solar or energy-efficient appliances to slash grid footprint.' },
                { category: 'Mobility', title: 'Transit & Carpool Shift', impact_tons: +(car_kg * 0.5 / 1000.0).toFixed(2), difficulty: 'Easy', action: 'Replace 2 solo car drives per week with public transit or carpooling.' },
                { category: 'Diet', title: 'Plant-Forward Nutrition', impact_tons: 0.45, difficulty: 'Easy', action: 'Incorporate 3 plant-based days weekly to reduce agricultural methane emissions.' }
            ]
        };
    },

    // Submit Calculation
    async submitCalculation() {
        const formData = this.getFormData();
        const btn = document.getElementById('btnCalculate');
        const origText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Calculating...`;
        }

        let payload = null;
        const isFile = window.location.protocol === 'file:';
        const endpoints = isFile ? ['http://127.0.0.1:5000/api/calculate'] : ['/api/calculate', '/calculate', 'http://127.0.0.1:5000/api/calculate'];

        for (const ep of endpoints) {
            try {
                const res = await fetch(ep, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    payload = await res.json();
                    break;
                }
            } catch (e) {
                // Try next
            }
        }

        if (!payload) {
            payload = this.calculateLocally(formData);
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origText;
        }

        this.lastCalculatedData = payload;
        this.renderResultsDashboard(payload);
    },

    // Render Full Results Dashboard
    renderResultsDashboard(data) {
        const resultsEl = document.getElementById('resultsSection');
        if (resultsEl) resultsEl.style.display = 'block';

        // Scroll to results
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update Top Metrics
        document.getElementById('resTotalTons').innerText = data.totalTons.toFixed(2);
        
        const gradeBadge = document.getElementById('resGradeBadge');
        if (gradeBadge) {
            gradeBadge.innerText = data.grade;
            gradeBadge.className = `metric-grade-pill ${data.badgeClass}`;
        }

        const diffPct = (((data.totalTons - 2.0) / 2.0) * 100).toFixed(1);
        const targetDiffEl = document.getElementById('resTargetDiff');
        if (targetDiffEl) {
            targetDiffEl.innerText = `${diffPct > 0 ? '+' : ''}${diffPct}%`;
            targetDiffEl.className = diffPct > 0 ? 'metric-sub-number text-warning' : 'metric-sub-number text-emerald';
        }

        document.getElementById('resTreesNeeded').innerText = data.treesNeeded;

        // Top Driver
        const breakdown = data.breakdown || {};
        let topCategory = 'Energy';
        let topVal = -1;
        for (const [k, v] of Object.entries(breakdown)) {
            if (v > topVal) {
                topVal = v;
                topCategory = k.charAt(0).toUpperCase() + k.slice(1);
            }
        }
        document.getElementById('resTopDriver').innerText = `${topCategory} (${topVal} T)`;

        // Render Charts
        this.renderCharts(data);

        // Render Granular Table
        this.renderGranularTable(data.detailedBreakdown, data.totalKg);

        // Render Action Plan
        this.renderActionPlan(data.actionPlan);

        // Update Offset & Tree Tab
        this.updateOffsetTab(data);
    },

    // Render Charts
    renderCharts(data) {
        if (typeof Chart === 'undefined') return;

        // 1. Category Doughnut Chart
        const ctxCat = document.getElementById('categoryDoughnutChart');
        if (ctxCat) {
            if (this.chartInstances.category) this.chartInstances.category.destroy();
            this.chartInstances.category = new Chart(ctxCat.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Household Energy', 'Mobility & Travel', 'Food & Nutrition', 'Circularity & Waste'],
                    datasets: [{
                        data: [data.breakdown.energy, data.breakdown.transport, data.breakdown.diet, data.breakdown.waste],
                        backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#06B6D4'],
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#9CA3AF', font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 } }
                        }
                    },
                    cutout: '70%'
                }
            });
        }

        // 2. Global Benchmark Bar Chart
        const ctxBench = document.getElementById('benchmarkBarChart');
        if (ctxBench) {
            if (this.chartInstances.benchmark) this.chartInstances.benchmark.destroy();
            const b = data.benchmarks || BENCHMARK_TARGETS;
            this.chartInstances.benchmark = new Chart(ctxBench.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Paris Target', 'India Avg', 'You (Annual)', 'Global Avg', 'EU Avg', 'USA Avg'],
                    datasets: [{
                        label: 'Tons CO₂e / Year',
                        data: [b.paris_target_2030, b.india, data.totalTons, b.global_avg, b.eu_avg, b.usa],
                        backgroundColor: [
                            '#10B981',
                            '#06B6D4',
                            data.totalTons > 4.7 ? '#F43F5E' : '#34D399',
                            'rgba(156, 163, 175, 0.4)',
                            'rgba(156, 163, 175, 0.3)',
                            'rgba(156, 163, 175, 0.2)'
                        ],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9CA3AF' } },
                        x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    },

    // Render Granular Sub-Category Breakdown Table
    renderGranularTable(details = {}, totalKg = 1) {
        const tbody = document.getElementById('granularTableBody');
        if (!tbody) return;

        const rows = [
            { name: 'Grid Electricity Consumption', cat: 'Energy', val: details.electricityKg || 0 },
            { name: 'Cooking Fuel (LPG/Gas)', cat: 'Energy', val: details.cookingFuelKg || 0 },
            { name: 'Personal Car Commute', cat: 'Mobility', val: details.carKg || 0 },
            { name: 'Two-Wheeler / Motorbike', cat: 'Mobility', val: details.bikeKg || 0 },
            { name: 'Public Transit (Bus & Metro)', cat: 'Mobility', val: details.publicTransitKg || 0 },
            { name: 'Aviation & Flights', cat: 'Mobility', val: details.flightsKg || 0 },
            { name: 'Dietary Direct Footprint', cat: 'Nutrition', val: details.dietKg || 0 },
            { name: 'Food Scrap & Waste Methane', cat: 'Nutrition', val: details.foodWasteKg || 0 },
            { name: 'Consumer Goods & Apparel', cat: 'Lifestyle', val: details.lifestyleKg || 0 },
            { name: 'Municipal Solid Waste', cat: 'Waste', val: details.wasteKg || 0 }
        ];

        tbody.innerHTML = rows.map(r => {
            const pct = ((r.val / totalKg) * 100).toFixed(1);
            let badgeStatus = '<span class="tag-badge optimal">Optimal</span>';
            if (pct > 25) badgeStatus = '<span class="tag-badge heavy">High Impact</span>';
            else if (pct > 12) badgeStatus = '<span class="tag-badge moderate">Moderate</span>';

            return `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td><span class="chart-badge">${r.cat}</span></td>
                    <td>${r.val.toLocaleString()} kg</td>
                    <td>${pct}%</td>
                    <td>${badgeStatus}</td>
                </tr>
            `;
        }).join('');
    },

    // Render Decarbonization Action Plan Cards
    renderActionPlan(actions = []) {
        const list = document.getElementById('actionItemsList');
        const counter = document.getElementById('actionCounter');
        if (!list) return;

        if (counter) counter.innerText = `${actions.length} Tailored Actions`;

        const icons = {
            'Energy': 'fa-solar-panel text-warning',
            'Mobility': 'fa-car-side text-primary',
            'Aviation': 'fa-plane text-cyan',
            'Nutrition': 'fa-utensils text-success',
            'Circularity': 'fa-recycle text-info'
        };

        list.innerHTML = actions.map(act => `
            <div class="action-card">
                <div class="action-category-icon">
                    <i class="fa-solid ${icons[act.category] || 'fa-lightbulb'}"></i>
                </div>
                <div class="action-body">
                    <div class="action-title-row">
                        <h4>${act.title}</h4>
                        <span class="impact-saving">-${act.impact_tons} Tons/yr</span>
                    </div>
                    <p>${act.action}</p>
                </div>
            </div>
        `).join('');
    },

    // Update Offset & Trees Tab
    updateOffsetTab(data) {
        const trees = data.treesNeeded || Math.round(data.totalKg / 22);
        const solarKwh = Math.round(data.totalKg / 0.72);
        const forestM2 = Math.round(trees * 12); // ~12 sqm per mature tree canopy

        const tEl = document.getElementById('offsetTreesCount');
        const sEl = document.getElementById('offsetSolarKwh');
        const fEl = document.getElementById('offsetAreaM2');

        if (tEl) tEl.innerText = `${trees.toLocaleString()} Trees`;
        if (sEl) sEl.innerText = `${solarKwh.toLocaleString()} kWh`;
        if (fEl) fEl.innerText = `${forestM2.toLocaleString()} m²`;
    },

    // Interactive Simulator
    initSimulator() {
        this.updateSimulator();
    },

    updateSimulator() {
        const solar = parseFloat(document.getElementById('simSolar')?.value || 50);
        const ev = parseFloat(document.getElementById('simEv')?.value || 50);
        const dietDays = parseFloat(document.getElementById('simDiet')?.value || 3);
        const flightsAvoided = parseFloat(document.getElementById('simFlights')?.value || 1);

        document.getElementById('simSolarVal').innerText = `${solar}% Clean`;
        document.getElementById('simEvVal').innerText = `${ev}% EV`;
        document.getElementById('simDietVal').innerText = `${dietDays} Days/wk`;
        document.getElementById('simFlightsVal').innerText = `${flightsAvoided} Flight(s)`;

        // Calculate simulated reduction
        const solarSavingsKg = (250 * 12 * 0.72) * (solar / 100.0) * 0.85;
        const evSavingsKg = (200 * 12 * (0.192 - 0.045)) * (ev / 100.0);
        const dietSavingsKg = (dietDays / 7.0) * 450.0;
        const flightSavingsKg = flightsAvoided * 180.0;

        const totalSavedKg = solarSavingsKg + evSavingsKg + dietSavingsKg + flightSavingsKg;
        const savedTons = (totalSavedKg / 1000.0).toFixed(2);
        const savedTrees = Math.round(totalSavedKg / 22.0);

        document.getElementById('simSavedTons').innerText = savedTons;
        document.getElementById('simSavedTrees').innerText = savedTrees;

        // Render Simulation Mini Chart
        const simCanvas = document.getElementById('simComparisonChart');
        if (simCanvas && typeof Chart !== 'undefined') {
            const baseline = this.lastCalculatedData ? this.lastCalculatedData.totalTons : 4.8;
            const newTons = Math.max(0.5, +(baseline - savedTons).toFixed(2));

            if (this.chartInstances.simulator) this.chartInstances.simulator.destroy();
            this.chartInstances.simulator = new Chart(simCanvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Current Baseline', 'With Decarbonization Plan'],
                    datasets: [{
                        data: [baseline, newTons],
                        backgroundColor: ['#F43F5E', '#10B981'],
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#9CA3AF' } },
                        x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
                    }
                }
            });
        }
    },

    // Print / Export Certificate Modal
    printCertificate() {
        const data = this.lastCalculatedData || this.calculateLocally(this.getFormData());
        document.getElementById('certEmissions').innerText = `${data.totalTons} Tons CO₂e/yr`;
        document.getElementById('certGrade').innerText = data.grade;
        document.getElementById('certTrees').innerText = `${data.treesNeeded} Trees/yr`;

        const modal = document.getElementById('certificateModal');
        if (modal) modal.style.display = 'flex';
    },

    scrollToCalculator() {
        document.getElementById('calculatorSection')?.scrollIntoView({ behavior: 'smooth' });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});