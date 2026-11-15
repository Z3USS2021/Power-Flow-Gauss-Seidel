const core = new TransformerCore();

const ctrl = {
    updateLog: () => {
        const log = document.getElementById('procedure-log');
        log.innerHTML = core.stepLog.map(line => `<p style="margin:2px 0;">${line}</p>`).join('');
        log.scrollTop = log.scrollHeight;
    },
    calculateNominal: () => {
        core.clearLog();
        core.calculateNominal(parseFloat(document.getElementById('S_nom').value), parseFloat(document.getElementById('V1_nom').value), parseFloat(document.getElementById('V2_nom').value), 60);
        ctrl.updateLog();
    },
    processSC: () => { core.processSC(parseFloat(document.getElementById('Vsc').value), parseFloat(document.getElementById('Isc').value), parseFloat(document.getElementById('Psc').value), document.getElementById('SideSC').value); ctrl.updateLog(); },
    processOC: () => { core.processOC(parseFloat(document.getElementById('Voc').value), parseFloat(document.getElementById('Ioc').value), parseFloat(document.getElementById('Poc').value), document.getElementById('SideOC').value); ctrl.updateLog(); },
    setReference: () => { core.calculateFinalParameters(document.getElementById('RefSide').value); ctrl.updateLog(); },
    solveAndPerformance: () => {
        core.solveFullCircuit(parseFloat(document.getElementById('LoadPercent').value), parseFloat(document.getElementById('PF').value), document.getElementById('LoadType').value);
        ctrl.updateLog(); ctrl.renderTable(); ctrl.drawPhasors();
    },
    drawPhasors: () => {
        const canvas = document.getElementById('canvasComplete');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,canvas.width,canvas.height);
        const ox = 80, oy = canvas.height/2;
        const scaleV = (canvas.width-180)/core.V_in_r.magnitude;
        const scaleX5 = scaleV * 5; // FACTOR DE ESCALA X5

        const drawV = (c, col, lbl, sc) => {
            const tx = ox + c.re * sc, ty = oy - c.im * sc;
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(tx,ty); ctx.stroke();
            ctx.fillStyle = col; ctx.font = "bold 11px sans-serif"; ctx.fillText(lbl, tx+5, ty);
        };
        drawV(core.V_out_r, "blue", "V2'", scaleV);
        drawV(core.I_out_r, "black", "I2' (x5)", scaleX5);
        drawV(core.dV2, "orange", "dV2' (x5)", scaleX5);
        drawV(core.E_r, "purple", "E'", scaleV);
        drawV(core.I_0, "green", "Io (x5)", scaleX5);
        drawV(core.I_in_r, "brown", "I1 (x5)", scaleX5);
        drawV(core.V_in_r, "red", "V1", scaleV);
    },
    renderTable: () => {
        const tbody = document.querySelector('#resumenTable tbody');
        const fR = (c) => { const s = c.im >= 0 ? "+" : ""; return `${c.re.toFixed(4)} ${s} j${c.im.toFixed(4)}`; };
        const fP = (c) => `${c.magnitude.toFixed(4)} ∠ ${c.phase.toFixed(2)}°`;
        
        const data = [
            ["--- VALORES FÍSICOS (REALES) ---", "", "", ""],
            ['Voltaje Primario (V1)', fR(core.V1_ph), fP(core.V1_ph), 'Real AT'],
            ['Voltaje Secundario (V2)', fR(core.V2_ph), fP(core.V2_ph), 'Real BT'],
            ['Corriente Primaria (I1)', fR(core.I1_ph), fP(core.I1_ph), 'Real AT'],
            ['Corriente Secundaria (I2)', fR(core.I2_ph), fP(core.I2_ph), 'Real BT'],
            ["--- VALORES REFERIDOS (CIRCUITO) ---", "", "", ""],
            ['Voltaje Inducido (E\')', fR(core.E_r), fP(core.E_r), 'Vout + Iout*Z2'],
            ['Corriente Vacío (Io)', fR(core.I_0), fP(core.I_0), 'Ic + Im'],
            ['Caída Tensión Primaria (ΔV1)', fR(core.dV1), fP(core.dV1), 'I1 * Z1'],
            ['Caída Tensión Sec. (ΔV2\')', fR(core.dV2), fP(core.dV2), 'I2\' * Z2\''],
            ["--- IMPEDANCIAS Y PÉRDIDAS ---", "", "", ""],
            ['Resistencia Eq (Req)', core.Req.toFixed(4) + ' Ω', '-', 'R1 + R2\''],
            ['Pérdidas Núcleo (Pfe)', core.P_fe_loss.toFixed(2) + ' W', '-', 'Fijas'],
            ['Pérdidas Cobre (Pcu)', core.P_cu_loss.toFixed(2) + ' W', '-', 'Variables'],
            ["--- DESEMPEÑO ---", "", "", ""],
            ['FP de Entrada', core.PF_in.toFixed(4), '-', 'cos(θ)'],
            ['Regulación', core.VoltageReg.toFixed(4) + ' %', '-', 'V_drop'],
            ['Eficiencia (η)', core.Efficiency.toFixed(4) + ' %', '-', 'Pout / Pin'],
            ['Eficiencia Máxima', core.max_eff.toFixed(4) + ' %', '-', `Al ${(core.k_max_eff*100).toFixed(2)}% carga`]
        ];

        tbody.innerHTML = data.map(r => {
            const isH = r[1] === "";
            return `<tr style="${isH ? 'background:#f2f2f7;font-weight:bold;color:#007aff;' : ''}">
                <td>${isH ? r[0] : '<strong>'+r[0]+'</strong>'}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td>
            </tr>`;
        }).join('');
    }
};

function openTab(e, n) {
    const cs = document.getElementsByClassName('tab-content');
    for (let c of cs) c.classList.remove('active');
    const ls = document.getElementsByClassName('tab-link');
    for (let l of ls) l.classList.remove('active');
    document.getElementById(n).classList.add('active'); e.currentTarget.classList.add('active');
    window.scrollTo(0,0);
}