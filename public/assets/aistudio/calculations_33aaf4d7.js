class TransformerCore {
    constructor() { this.stepLog = []; this.a = 1; }
    log(msg) { this.stepLog.push(msg); }
    clearLog() { this.stepLog = []; }

    calculateNominal(S, V1, V2, f) {
        this.S_nom = S; this.V1_nom = V1; this.V2_nom = V2; this.f = f;
        this.a = V1 / V2;
        this.I1_nom = S / V1; this.I2_nom = S / V2;
        this.log("--- PASO 1: DATOS NOMINALES ---");
        this.log(`a = V1/V2 = ${V1.toFixed(2)}/${V2.toFixed(2)} = ${this.a.toFixed(4)}`);
        this.log(`I1_nom = ${this.I1_nom.toFixed(4)} A, I2_nom = ${this.I2_nom.toFixed(4)} A\n`);
    }

    processSC(Vsc, Isc, Psc, side) {
        this.sideSC = side; this.Vsc_test = Vsc; this.Isc_test = Isc; this.Psc_test = Psc;
        this.Zsc_test = Vsc / Isc; this.Rsc_test = Psc / (Isc ** 2);
        this.Xsc_test = Math.sqrt(Math.abs(this.Zsc_test ** 2 - this.Rsc_test ** 2));
        this.log("--- PASO 2: ENSAYO SC ---");
        this.log(`Rsc_test = ${this.Rsc_test.toFixed(4)} Ω, Xsc_test = ${this.Xsc_test.toFixed(4)} Ω\n`);
    }

    processOC(Voc, Ioc, Poc, side) {
        this.sideOC = side; this.Voc_test = Voc; this.Ioc_test = Ioc; this.Poc_test = Poc;
        this.Gc_test = Poc / (Voc ** 2); this.Bm_test = Math.sqrt(Math.abs((Ioc/Voc)**2 - this.Gc_test**2));
        this.log("--- PASO 3: ENSAYO OC ---");
        this.log(`Gc_test = ${this.Gc_test.toFixed(8)} S, Bm_test = ${this.Bm_test.toFixed(8)} S\n`);
    }

    calculateFinalParameters(target) {
        this.refSide = target;
        const isV1H = this.V1_nom > this.V2_nom;
        const target_isV1 = target === 'Lado Primario';
        const sc_isV1 = (this.sideSC === 'Alta Tensión' && isV1H) || (this.sideSC === 'Baja Tensión' && !isV1H);
        const f_sc = (sc_isV1 === target_isV1) ? 1 : (target_isV1 ? this.a**2 : 1/this.a**2);
        this.Req = this.Rsc_test * f_sc; this.Xeq = this.Xsc_test * f_sc;

        const oc_isV1 = (this.sideOC === 'Alta Tensión' && isV1H) || (this.sideOC === 'Baja Tensión' && !isV1H);
        const f_oc = (oc_isV1 === target_isV1) ? 1 : (target_isV1 ? 1/this.a**2 : this.a**2);
        this.Gc = this.Gc_test * f_oc; this.Bm = this.Bm_test * f_oc;

        if (target_isV1) {
            this.R1_f = this.Req / 2; this.X1_f = this.Xeq / 2;
            this.R2_f = this.R1_f / (this.a**2); this.X2_f = this.X1_f / (this.a**2);
        } else {
            this.R1_f = (this.Req / 2) * (this.a**2); this.X1_f = (this.Xeq / 2) * (this.a**2);
            this.R2_f = this.Req / 2; this.X2_f = this.Xeq / 2;
        }
        this.log(`--- PASO 4: PARÁMETROS REFERIDOS AL ${target.toUpperCase()} ---`);
        this.log(`Req = ${this.Req.toFixed(4)} Ω, Gc = ${this.Gc.toFixed(8)} S\n`);
    }

    solveFullCircuit(percent, pf, type) {
        this.loadPercent = percent / 100; this.powerFactor = pf;
        const V_base = (this.refSide === 'Lado Primario') ? this.V1_nom : this.V2_nom;
        const I_base = (this.refSide === 'Lado Primario') ? this.I1_nom : this.I2_nom;
        const phi = Math.acos(pf) * 180 / Math.PI;
        const theta_i = type.includes('Atraso') ? -phi : (type.includes('Adelanto') ? phi : 0);

        this.V_out_r = new Complex(V_base, 0);
        this.I_out_r = Complex.fromPolar(I_base * this.loadPercent, theta_i);
        const Z_branch = new Complex(this.Req / 2, this.Xeq / 2);

        this.dV2 = this.I_out_r.mul(Z_branch);
        this.E_r = this.V_out_r.add(this.dV2);
        this.I_fe = new Complex(this.E_r.re * this.Gc, this.E_ref?.im * this.Gc || this.E_r.im * this.Gc);
        this.I_mag = new Complex(this.E_r.im * this.Bm, -this.E_r.re * this.Bm);
        this.I_0 = this.I_fe.add(this.I_mag);
        this.I_in_r = this.I_out_r.add(this.I_0);
        this.dV1 = this.I_in_r.mul(Z_branch);
        this.V_in_r = this.E_r.add(this.dV1);

        // Eficiencia PDF
        const Psc_nom = this.Psc_test * Math.pow(I_base / this.Isc_test, 2);
        this.P_out = this.S_nom * this.loadPercent * pf;
        this.P_fe_loss = this.Poc_test;
        this.P_cu_loss = Math.pow(this.loadPercent, 2) * Psc_nom;
        this.Efficiency = (this.P_out / (this.P_out + this.P_fe_loss + this.P_cu_loss)) * 100;
        this.VoltageReg = ((this.V_in_r.magnitude - this.V_out_r.magnitude) / this.V_out_r.magnitude) * 100;
        this.PF_in = Math.cos((this.V_in_r.phase - this.I_in_r.phase) * Math.PI / 180);

        // Fisicos
        if (this.refSide === 'Lado Primario') {
            this.V1_ph = this.V_in_r; this.V2_ph = this.V_out_r.div(this.a);
            this.I1_ph = this.I_in_r; this.I2_ph = this.I_out_r.mul(this.a);
            this.E1_ph = this.E_r; this.E2_ph = this.E_r.div(this.a);
        } else {
            this.V1_ph = this.V_in_r.mul(this.a); this.V2_ph = this.V_out_r;
            this.I1_ph = this.I_in_r.div(this.a); this.I2_ph = this.I_out_r;
            this.E1_ph = this.E_r.mul(this.a); this.E2_ph = this.E_r;
        }

        this.k_max_eff = Math.sqrt(this.P_fe_loss / Psc_nom);
        this.max_eff = ((this.S_nom * this.k_max_eff * pf) / (this.S_nom * this.k_max_eff * pf + 2 * this.P_fe_loss)) * 100;

        this.log("--- PASO 6: CIRCUITO RESUELTO ---");
        this.log(`Vin = ${this.V_in_r.formatMatlab()} V\nIin = ${this.I_in_r.formatMatlab()} A`);
    }
}