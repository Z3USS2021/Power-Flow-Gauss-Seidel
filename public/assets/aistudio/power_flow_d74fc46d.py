import numpy as np


def fmt_c(z, dec=4):
    """Formatea un número complejo evitando -0.0000."""
    re = 0.0 if abs(z.real) < 10**(-(dec + 1)) else z.real
    im = 0.0 if abs(z.imag) < 10**(-(dec + 1)) else z.imag
    return f"({re:.{dec}f}{im:+.{dec}f}j)"


def fmt_pol(z, dec_m=5, dec_a=2):
    """Formatea un número complejo en forma polar."""
    ang = np.rad2deg(np.angle(z))
    ang = 0.0 if abs(ang) < 10**(-(dec_a + 1)) else ang
    return f"{np.abs(z):.{dec_m}f}∠{ang:+.{dec_a}f}°"


def construir_ybus(barras, lineas):
    """Construye Y_bus a partir de las líneas en modelo equivalente pi."""
    n = len(barras)
    id_a_idx = {b['id']: idx for idx, b in enumerate(barras)}
    Ybus = np.zeros((n, n), dtype=complex)

    for linea in lineas:
        i = id_a_idx[linea['de']]
        j = id_a_idx[linea['a']]

        y_ij = 1.0 / linea['z'] if linea.get('z') is not None else linea['y']
        y_sh = linea.get('y_sh', 0.0j)

        Ybus[i, i] += y_ij + y_sh / 2.0
        Ybus[j, j] += y_ij + y_sh / 2.0
        Ybus[i, j] -= y_ij
        Ybus[j, i] -= y_ij

    return Ybus, id_a_idx


def inicializar_voltajes(barras):
    """Inicialización Flat Start."""
    n = len(barras)
    V = np.zeros(n, dtype=complex)
    for idx, b in enumerate(barras):
        tipo = b['tipo'].upper()
        if tipo == 'SLACK':
            delta_rad = np.deg2rad(b.get('delta_deg', 0.0))
            V[idx] = b['V_mag'] * np.exp(1j * delta_rad)
        elif tipo == 'PV':
            V[idx] = b['V_mag'] + 0.0j
        elif tipo == 'PQ':
            V[idx] = 1.0 + 0.0j
        else:
            raise ValueError(f"Tipo de barra no reconocido: {b['tipo']}")
    return V


def mostrar_datos_entrada(barras, lineas, S_base, titulo_sistema="DATOS DE ENTRADA DEL SISTEMA", indicaciones=None):
    """Imprime en tablas los datos de barras, líneas y las indicaciones de ingreso."""
    print("\n" + "=" * 95)
    print(f"{titulo_sistema}  (S_base = {S_base:.1f} MVA)")
    print("=" * 95)

    print("\n--- TABLA DE DATOS DE BARRAS ---")
    print(f"{'Barra':<6} {'Tipo':<6} {'|V|_0/esp':>9} {'δ_0 [°]':>8} "
          f"{'P_G [MW]':>9} {'Q_G [Mvar]':>10} {'P_D [MW]':>9} {'Q_D [Mvar]':>10} "
          f"{'P_esp[pu]':>10} {'Q_esp[pu]':>10}")
    print("-" * 95)
    for b in barras:
        t = b['tipo'].upper()
        p_esp = b.get('PG', 0.0) - b.get('PD', 0.0)
        q_esp = b.get('QG', 0.0) - b.get('QD', 0.0)
        p_esp_str = f"{p_esp:>+10.4f}" if t != 'SLACK' else f"{'(incógn.)':>10}"
        q_esp_str = f"{q_esp:>+10.4f}" if t == 'PQ' else f"{'(incógn.)':>10}"
        qg_str = f"{b.get('QG', 0.0)*S_base:>10.2f}" if t == 'PQ' else f"{'---':>10}"
        print(
            f"{b['id']:<6} {b['tipo']:<6} {b.get('V_mag', 1.0):>9.4f} {b.get('delta_deg', 0.0):>8.2f} "
            f"{b.get('PG', 0.0)*S_base:>9.2f} {qg_str} "
            f"{b.get('PD', 0.0)*S_base:>9.2f} {b.get('QD', 0.0)*S_base:>10.2f} "
            f"{p_esp_str} {q_esp_str}"
        )

    pv_con_lim = [
        b for b in barras
        if b['tipo'].upper() == 'PV'
        and (np.isfinite(b.get('Q_min', -np.inf)) or np.isfinite(b.get('Q_max', np.inf)))
    ]
    if pv_con_lim:
        print("\nLímites reactivos en barras PV:")
        for b in pv_con_lim:
            qmin = b.get('Q_min', -np.inf)
            qmax = b.get('Q_max', np.inf)
            print(f"  Barra {b['id']}: Q_G,min = {qmin:.4f} pu ({qmin*S_base:.2f} Mvar) | "
                  f"Q_G,max = {qmax:.4f} pu ({qmax*S_base:.2f} Mvar)")

    print("\n--- TABLA DE DATOS DE LÍNEAS (Modelo π en p.u.) ---")
    print(f"{'Línea':<8} {'R [pu]':>10} {'X [pu]':>10} {'G_ser [pu]':>12} {'B_ser [pu]':>12} {'Y/2 [pu]':>11} {'B_sh_tot [pu]':>14}")
    print("-" * 95)
    for l in lineas:
        z = l['z'] if l.get('z') is not None else 1.0 / l['y']
        y_ser = 1.0 / z
        b_sh = np.imag(l.get('y_sh', 0.0j))
        par = f"{l['de']}-{l['a']}"
        print(
            f"{par:<8} {z.real:>10.5f} {z.imag:>10.5f} "
            f"{y_ser.real:>12.6f} {y_ser.imag:>12.6f} "
            f"{b_sh/2.0:>11.5f} {b_sh:>14.5f}"
        )

    if indicaciones:
        print("\n--- INDICACIONES DE INGRESO ---")
        for linea_txt in indicaciones:
            print(f"  * {linea_txt}")
    print("=" * 95)


def resolver_flujo_gauss_seidel(barras, lineas, n_iter, tol=1e-6, alpha=1.0, mostrar_iter=True):
    """Resuelve el flujo de potencia por Gauss-Seidel y guarda el paso a paso de tensiones."""
    n = len(barras)
    Ybus, id_a_idx = construir_ybus(barras, lineas)
    V = inicializar_voltajes(barras)

    P_esp = np.array([b.get('PG', 0.0) - b.get('PD', 0.0) for b in barras], dtype=float)
    Q_esp = np.array([b.get('QG', 0.0) - b.get('QD', 0.0) for b in barras], dtype=float)
    V_mag_esp = np.array([b.get('V_mag', 1.0) for b in barras], dtype=float)
    tipo_actual = [b['tipo'].upper() for b in barras]

    convergido = False
    iter_realizadas = 0
    max_error = 0.0
    historial_pasos = []

    if mostrar_iter:
        print("\n" + "=" * 95)
        print("EVOLUCIÓN DE LAS ITERACIONES (GAUSS-SEIDEL)")
        print("=" * 95)

    for k in range(1, n_iter + 1):
        V_prev = V.copy()
        max_error = 0.0
        pasos_iter_k = []

        for i in range(n):
            b_id = barras[i]['id']
            tipo_original = barras[i]['tipo'].upper()
            if tipo_original == 'SLACK':
                continue

            # Construir suma mutua (solo barras conectadas Y_ij != 0)
            sym_mutua = []
            num_mutua = []
            suma_mutua = 0.0j
            for j in range(n):
                if j != i and abs(Ybus[i, j]) > 1e-12:
                    vj = V[j]
                    it_j = k if j < i else k - 1
                    sym_mutua.append(f"Y_{b_id}{barras[j]['id']}*V_{barras[j]['id']}^({it_j})")
                    num_mutua.append(f"{fmt_c(Ybus[i, j])}*{fmt_c(vj)}")
                    suma_mutua += Ybus[i, j] * vj

            sym_mutua_str = " + ".join(sym_mutua) if sym_mutua else "0"
            num_mutua_str = " + ".join(num_mutua) if num_mutua else "0"

            es_pv_valido = False
            info_q = None

            if tipo_original == 'PV':
                suma_completa = suma_mutua + Ybus[i, i] * V_prev[i]
                Q_calc = -np.imag(np.conj(V_prev[i]) * suma_completa)

                Q_D = barras[i].get('QD', 0.0)
                Q_G_calc = Q_calc + Q_D
                Q_min = barras[i].get('Q_min', -np.inf)
                Q_max = barras[i].get('Q_max', np.inf)

                nota_lim = "dentro de límites (se mantiene PV)"
                if Q_G_calc < Q_min:
                    Q_esp[i] = Q_min - Q_D
                    tipo_actual[i] = 'PQ (límite Q_min)'
                    nota_lim = f"Q_G={Q_G_calc:.4f} < Q_min={Q_min:.4f} -> fija Q_esp={Q_esp[i]:.4f} (pasa a PQ)"
                elif Q_G_calc > Q_max:
                    Q_esp[i] = Q_max - Q_D
                    tipo_actual[i] = 'PQ (límite Q_max)'
                    nota_lim = f"Q_G={Q_G_calc:.4f} > Q_max={Q_max:.4f} -> fija Q_esp={Q_esp[i]:.4f} (pasa a PQ)"
                else:
                    Q_esp[i] = Q_calc
                    tipo_actual[i] = 'PV'
                    es_pv_valido = True

                sym_q = f"Y_{b_id}{b_id}*V_{b_id}^({k-1}) + {sym_mutua_str}"
                num_q = f"{fmt_c(Ybus[i, i])}*{fmt_c(V_prev[i])} + {num_mutua_str}"
                info_q = {
                    'formula_q': f"Q_{b_id}^({k}) = -Im{{ (V_{b_id}^({k-1}))* * [ {sym_q} ] }}",
                    'datos_q': f"Q_{b_id}^({k}) = -Im{{ {fmt_c(np.conj(V_prev[i]))} * [ {num_q} ] }}",
                    'resp_q': f"Q_{b_id}^({k}) = {Q_calc:+.5f} pu  ({nota_lim})",
                }

            numer = complex(P_esp[i], -Q_esp[i])
            V_tilde = (1.0 / Ybus[i, i]) * (numer / np.conj(V_prev[i]) - suma_mutua)
            V_acc = V_prev[i] + alpha * (V_tilde - V_prev[i])

            if es_pv_valido:
                V[i] = V_mag_esp[i] * (V_acc / np.abs(V_acc))
            else:
                V[i] = V_acc

            # Guardar detalle paso a paso de la barra i en la iteración k
            q_lbl = f"Q_{b_id}^({k})" if (tipo_original == 'PV' and es_pv_valido) else f"Q_{b_id},esp"
            v_lbl = f"V~_{b_id}^({k})" if (es_pv_valido or alpha != 1.0) else f"V_{b_id}^({k})"

            paso_bus = {
                'id': b_id,
                'tipo': tipo_actual[i],
                'info_q': info_q,
                'formula_v': f"{v_lbl} = (1 / Y_{b_id}{b_id}) * [ (P_{b_id},esp - j{q_lbl})/(V_{b_id}^({k-1}))* - ({sym_mutua_str}) ]",
                'datos_v': f"{v_lbl} = (1 / {fmt_c(Ybus[i, i])}) * [ {fmt_c(numer)}/{fmt_c(np.conj(V_prev[i]))} - ({num_mutua_str}) ]",
                'v_tilde': V_tilde,
                'v_acc': V_acc,
                'v_final': V[i],
                'v_prev': V_prev[i],
                'v_esp': V_mag_esp[i],
                'alpha': alpha,
                'es_pv_valido': es_pv_valido,
                'v_lbl': v_lbl,
            }
            pasos_iter_k.append(paso_bus)

            error_i = np.abs(V[i] - V_prev[i])
            if error_i > max_error:
                max_error = error_i

        historial_pasos.append({'k': k, 'max_error': max_error, 'pasos': pasos_iter_k})
        iter_realizadas = k

        if mostrar_iter:
            resumen_v = " | ".join(
                f"B{barras[idx]['id']}: {np.abs(V[idx]):.5f}∠{np.rad2deg(np.angle(V[idx])):+.3f}°"
                for idx in range(n)
            )
            print(f"Iter {k:3d} | max|ΔV|={max_error:.2e} | {resumen_v}")

        if tol > 0 and max_error <= tol:
            convergido = True
            break

    # Potencias activas y reactivas en todas las barras
    P_calc = np.zeros(n)
    Q_calc_bus = np.zeros(n)
    G = np.real(Ybus)
    B = np.imag(Ybus)
    V_mag = np.abs(V)
    delta = np.angle(V)

    for i in range(n):
        for j in range(n):
            theta_ij = delta[i] - delta[j]
            P_calc[i] += V_mag[i] * V_mag[j] * (G[i, j] * np.cos(theta_ij) + B[i, j] * np.sin(theta_ij))
            Q_calc_bus[i] += V_mag[i] * V_mag[j] * (G[i, j] * np.sin(theta_ij) - B[i, j] * np.cos(theta_ij))

    slack_resultados = {}
    for idx, b in enumerate(barras):
        if b['tipo'].upper() == 'SLACK':
            I_slack = np.sum(Ybus[idx, :] * V)
            S_slack = V[idx] * np.conj(I_slack)
            slack_resultados[b['id']] = (I_slack, S_slack)

    # Flujos en líneas y pérdidas
    flujos = []
    S_perd_total = 0.0j
    for linea in lineas:
        i = id_a_idx[linea['de']]
        j = id_a_idx[linea['a']]

        y_ij = 1.0 / linea['z'] if linea.get('z') is not None else linea['y']
        y_sh = linea.get('y_sh', 0.0j)

        I_ij = (V[i] - V[j]) * y_ij + V[i] * (y_sh / 2.0)
        I_ji = (V[j] - V[i]) * y_ij + V[j] * (y_sh / 2.0)

        S_ij = V[i] * np.conj(I_ij)
        S_ji = V[j] * np.conj(I_ji)
        S_perd_ij = S_ij + S_ji

        S_perd_total += S_perd_ij
        flujos.append({
            'de': linea['de'], 'a': linea['a'],
            'I_ij': I_ij, 'I_ji': I_ji,
            'S_ij': S_ij, 'S_ji': S_ji, 'S_perd': S_perd_ij,
        })

    PG_final = np.array([P_calc[idx] + barras[idx].get('PD', 0.0) for idx in range(n)])
    QG_final = np.array([Q_calc_bus[idx] + barras[idx].get('QD', 0.0) for idx in range(n)])
    PD_total = sum(b.get('PD', 0.0) for b in barras)
    QD_total = sum(b.get('QD', 0.0) for b in barras)

    return {
        'Ybus': Ybus, 'V': V, 'tipo_actual': tipo_actual,
        'iter_realizadas': iter_realizadas, 'convergido': convergido, 'max_error': max_error,
        'P_bus': P_calc, 'Q_bus': Q_calc_bus, 'PG_final': PG_final, 'QG_final': QG_final,
        'slack_resultados': slack_resultados, 'flujos': flujos, 'S_perd_total': S_perd_total,
        'PG_total': float(np.sum(PG_final)), 'QG_total': float(np.sum(QG_final)),
        'PD_total': PD_total, 'QD_total': QD_total,
        'historial_pasos': historial_pasos,
    }


def imprimir_paso_a_paso_tensiones(historial_pasos):
    """Imprime fórmula, datos sustituidos y respuesta corta de las tensiones por iteración."""
    print("\n" + "=" * 95)
    print("PROCEDIMIENTO PASO A PASO DEL CÁLCULO DE TENSIONES POR ITERACIÓN")
    print("=" * 95)

    for iter_info in historial_pasos:
        k = iter_info['k']
        print(f"\n>>> ITERACIÓN {k} (max|ΔV| = {iter_info['max_error']:.2e} p.u.) <<<")
        for p in iter_info['pasos']:
            b_id = p['id']
            print(f"\nBarra {b_id} ({p['tipo']}):")

            if p['info_q'] is not None:
                print(f"  Fórmula Q : {p['info_q']['formula_q']}")
                print(f"  Datos Q   : {p['info_q']['datos_q']}")
                print(f"  Resp. Q   : {p['info_q']['resp_q']}")

            print(f"  Fórmula V : {p['formula_v']}")
            print(f"  Datos V   : {p['datos_v']}")

            if p['alpha'] != 1.0:
                print(f"  Provis.   : {p['v_lbl']} = {fmt_c(p['v_tilde'], 5)} pu  =  {fmt_pol(p['v_tilde'])}")
                print(
                    f"  Acelerac. : V_acc = V^({k-1}) + α*(V~ - V^({k-1})) = "
                    f"{fmt_c(p['v_prev'], 5)} + {p['alpha']}*({fmt_c(p['v_tilde'], 5)} - {fmt_c(p['v_prev'], 5)}) = {fmt_c(p['v_acc'], 5)}"
                )
            elif p['es_pv_valido']:
                print(f"  Provis.   : {p['v_lbl']} = {fmt_c(p['v_tilde'], 5)} pu  =  {fmt_pol(p['v_tilde'])}")

            if p['es_pv_valido']:
                v_base = p['v_acc']
                print(
                    f"  Correcc.  : V_{b_id}^({k}) = |V_{b_id}|_esp * (V_provis / |V_provis|) = "
                    f"{p['v_esp']:.4f} * ({fmt_c(v_base, 5)} / {np.abs(v_base):.5f})"
                )

            print(f"  Resp. V   : V_{b_id}^({k}) = {fmt_c(p['v_final'], 5)} pu  =  {fmt_pol(p['v_final'])}")

    print("\n" + "=" * 95)


def imprimir_reporte(barras, res, S_base=1.0):
    print("\n" + "=" * 95)
    print("MATRIZ DE ADMITANCIAS NODALES (Y_bus) [p.u.]")
    print("=" * 95)
    np.set_printoptions(precision=6, suppress=True, linewidth=135)
    print(res['Ybus'])

    print("\n" + "=" * 95)
    print("RESUMEN DE CONVERGENCIA")
    print("=" * 95)
    estado = "SÍ (tolerancia alcanzada)" if res['convergido'] else "NO (se alcanzó el límite de iteraciones)"
    print(f"Iteraciones ejecutadas : {res['iter_realizadas']}")
    print(f"Convergido             : {estado}")
    print(f"Error máximo final     : {res['max_error']:.6e} p.u.")

    print("\n" + "=" * 95)
    print("TENSIONES Y POTENCIAS EN BARRAS (Forma Polar y Rectangular) [p.u.]")
    print("=" * 95)
    print(f"{'Barra':<5} {'Tipo':<14} {'|V| [pu]':>10} {'δ [°]':>9} {'V_rect [pu]':>21} {'P_neta':>9} {'Q_neta':>9} {'P_G':>9} {'Q_G':>9}")
    print("-" * 95)
    for idx, b in enumerate(barras):
        v = res['V'][idx]
        v_rect_str = f"{v.real:.5f}{v.imag:+.5f}j"
        print(
            f"{b['id']:<5} {res['tipo_actual'][idx]:<14} "
            f"{np.abs(v):>10.6f} {np.rad2deg(np.angle(v)):>9.4f} {v_rect_str:>21} "
            f"{res['P_bus'][idx]:>9.5f} {res['Q_bus'][idx]:>9.5f} "
            f"{res['PG_final'][idx]:>9.5f} {res['QG_final'][idx]:>9.5f}"
        )

    if S_base != 1.0:
        print(f"\nPotencias generadas con S_base = {S_base:.1f} MVA:")
        for idx, b in enumerate(barras):
            print(f"  Barra {b['id']}: P_G = {res['PG_final'][idx]*S_base:8.3f} MW | Q_G = {res['QG_final'][idx]*S_base:8.3f} Mvar")

    print("\n" + "=" * 95)
    print("POTENCIA CALCULADA EN BARRA SLACK (S_1 = V_1 * I_1*)")
    print("=" * 95)
    for b_id, (I_1, S_1) in res['slack_resultados'].items():
        print(f"Barra {b_id}: I_1 = {I_1:.6f} pu | P_1 = {S_1.real:.6f} pu | Q_1 = {S_1.imag:.6f} pu")

    print("\n" + "=" * 95)
    print("FLUJOS DE POTENCIA Y PÉRDIDAS EN LÍNEAS [p.u.]")
    print("=" * 95)
    print(f"{'De-A':<8} {'P_ij':>10} {'Q_ij':>10} {'P_ji':>10} {'Q_ji':>10} {'P_perd':>10} {'Q_perd':>10}")
    print("-" * 95)
    for f in res['flujos']:
        par = f"{f['de']}->{f['a']}"
        print(
            f"{par:<8} "
            f"{f['S_ij'].real:>10.5f} {f['S_ij'].imag:>10.5f} "
            f"{f['S_ji'].real:>10.5f} {f['S_ji'].imag:>10.5f} "
            f"{f['S_perd'].real:>10.5f} {f['S_perd'].imag:>10.5f}"
        )

    print("-" * 95)
    print(
        f"Pérdidas totales: P_perd,total = {res['S_perd_total'].real:.6f} pu ({res['S_perd_total'].real*S_base:.3f} MW) | "
        f"Q_perd,total = {res['S_perd_total'].imag:.6f} pu ({res['S_perd_total'].imag*S_base:.3f} Mvar)"
    )

    print("\n" + "=" * 95)
    print("BALANCE DE POTENCIA DEL SISTEMA [p.u.]")
    print("=" * 95)
    print(f"Activa   -> ΣP_G = {res['PG_total']:.6f} | ΣP_D + P_perd,total = {res['PD_total'] + res['S_perd_total'].real:.6f}")
    print(f"Reactiva -> ΣQ_G = {res['QG_total']:.6f} | ΣQ_D + Q_perd,total = {res['QD_total'] + res['S_perd_total'].imag:.6f}")
    print("=" * 95)


def cargar_ejemplo_stevenson_9_2():
    """Ejemplo 9.2 de Grainger & Stevenson (4 barras, Base 100 MVA, 230 kV)."""
    S_base = 100.0
    barras = [
        {'id': 1, 'tipo': 'Slack', 'V_mag': 1.00, 'delta_deg': 0.0, 'PG': 0.0,  'QG': 0.0, 'PD': 0.50, 'QD': 0.3099},
        {'id': 2, 'tipo': 'PQ',    'V_mag': 1.00, 'delta_deg': 0.0, 'PG': 0.0,  'QG': 0.0, 'PD': 1.70, 'QD': 1.0535},
        {'id': 3, 'tipo': 'PQ',    'V_mag': 1.00, 'delta_deg': 0.0, 'PG': 0.0,  'QG': 0.0, 'PD': 2.00, 'QD': 1.2394},
        {'id': 4, 'tipo': 'PV',    'V_mag': 1.02, 'delta_deg': 0.0, 'PG': 3.18, 'QG': 0.0, 'PD': 0.80, 'QD': 0.4958, 'Q_min': -np.inf, 'Q_max': np.inf},
    ]
    lineas = [
        {'de': 1, 'a': 2, 'z': 0.01008 + 0.05040j, 'y_sh': 0.10250j},
        {'de': 1, 'a': 3, 'z': 0.00744 + 0.03720j, 'y_sh': 0.07750j},
        {'de': 2, 'a': 4, 'z': 0.00744 + 0.03720j, 'y_sh': 0.07750j},
        {'de': 3, 'a': 4, 'z': 0.01272 + 0.06360j, 'y_sh': 0.12750j},
    ]
    indicaciones = [
        "S_base = 100 MVA: todas las potencias en MW/Mvar de la Tabla 9.3 se dividen entre 100.",
        "Demandas (P_D, Q_D): se ingresan POSITIVAS (ej. 170 MW y 105.35 Mvar -> 1.70 y 1.0535 pu).",
        "Barra 4 es tipo PV: |V|_esp = 1.02 pu, P_G = 318 MW (3.18 pu), P_D = 80 MW (0.80 pu), Q_D = 49.58 Mvar (0.4958 pu).",
        "Susceptancia shunt: en la Tabla 9.2 dan Y/2; aquí se ingresa B_sh_tot = 2 * (Y/2).",
        "Iteraciones sugeridas (α=1.0): 9 iter. para tol=1e-4, 16 iter. para tol=1e-6, 24 iter. para tol=1e-8.",
    ]
    return barras, lineas, S_base, "EJEMPLO 9.2 DE GRAINGER & STEVENSON", indicaciones


def cargar_sistema_ejemplo_3_barras():
    S_base = 100.0
    barras = [
        {'id': 1, 'tipo': 'Slack', 'V_mag': 1.05, 'delta_deg': 0.0, 'PG': 0.0, 'QG': 0.0, 'PD': 0.0, 'QD': 0.0},
        {'id': 2, 'tipo': 'PQ',    'V_mag': 1.0,  'delta_deg': 0.0, 'PG': 0.0, 'QG': 0.0, 'PD': 4.0, 'QD': 2.5},
        {'id': 3, 'tipo': 'PV',    'V_mag': 1.04, 'delta_deg': 0.0, 'PG': 2.0, 'QG': 0.0, 'PD': 0.0, 'QD': 0.0, 'Q_min': -1.0, 'Q_max': 3.0},
    ]
    lineas = [
        {'de': 1, 'a': 2, 'z': 0.02 + 0.04j,    'y_sh': 0.0j},
        {'de': 1, 'a': 3, 'z': 0.01 + 0.03j,    'y_sh': 0.0j},
        {'de': 2, 'a': 3, 'z': 0.0125 + 0.025j, 'y_sh': 0.0j},
    ]
    indicaciones = [
        "Sistema de 3 barras en Base 100 MVA sin susceptancia shunt en las líneas (B_sh_tot = 0).",
        "Barra 3 es PV con límites de generación reactiva: -100 Mvar <= Q_G3 <= 300 Mvar.",
    ]
    return barras, lineas, S_base, "SISTEMA DE EJEMPLO DE 3 BARRAS", indicaciones


def ingresar_sistema_manual():
    S_base = float(input("\nIngrese S_base en MVA (ej. 100 si ingresará MW/Mvar, o 1 si ya está en p.u.): ") or 1.0)
    unidad_p = "MW" if S_base != 1.0 else "pu"
    unidad_q = "Mvar" if S_base != 1.0 else "pu"

    n_barras = int(input("Ingrese el número total de barras: "))
    barras = []

    print(f"\n--- INGRESO DE BARRAS (ingrese demandas P_D y Q_D como valores POSITIVOS en {unidad_p}/{unidad_q}) ---")
    for k in range(1, n_barras + 1):
        print(f"\nBarra {k}:")
        tipo = input("  Tipo (Slack / PQ / PV): ").strip().upper()
        PG = float(input(f"  Generación activa P_G [{unidad_p}] (0 si no hay): ") or 0.0) / S_base
        QG = float(input(f"  Generación reactiva Q_G [{unidad_q}] (0 si no hay o es incógnita): ") or 0.0) / S_base
        PD = abs(float(input(f"  Demanda activa P_D [{unidad_p}] (positiva, 0 si no hay): ") or 0.0)) / S_base
        QD = abs(float(input(f"  Demanda reactiva Q_D [{unidad_q}] (positiva, 0 si no hay): ") or 0.0)) / S_base

        barra = {'id': k, 'tipo': tipo, 'PG': PG, 'QG': QG, 'PD': PD, 'QD': QD, 'V_mag': 1.0, 'delta_deg': 0.0}

        if tipo == 'SLACK':
            barra['V_mag'] = float(input("  Magnitud de voltaje |V| [pu]: "))
            barra['delta_deg'] = float(input("  Ángulo de voltaje δ [grados]: ") or 0.0)
        elif tipo == 'PV':
            barra['V_mag'] = float(input("  Magnitud de voltaje especificada |V|_esp [pu]: "))
            qmin_str = input(f"  Límite mínimo Q_G,min [{unidad_q}] (Enter si no hay límite): ").strip()
            qmax_str = input(f"  Límite máximo Q_G,max [{unidad_q}] (Enter si no hay límite): ").strip()
            barra['Q_min'] = float(qmin_str) / S_base if qmin_str else -np.inf
            barra['Q_max'] = float(qmax_str) / S_base if qmax_str else np.inf

        barras.append(barra)

    n_lineas = int(input("\nIngrese el número total de líneas: "))
    lineas = []
    print("\n--- INGRESO DE LÍNEAS (impedancia y susceptancia en p.u.) ---")
    for m in range(1, n_lineas + 1):
        print(f"\nLínea {m}:")
        de = int(input("  Barra de envío (i): "))
        a = int(input("  Barra de recepción (j): "))
        r = float(input("  Resistencia serie R [pu]: "))
        x = float(input("  Reactancia serie X [pu]: "))
        b_sh = float(input("  Susceptancia shunt TOTAL B_sh [pu] (= 2 * Y/2, 0 si no hay): ") or 0.0)
        lineas.append({'de': de, 'a': a, 'z': complex(r, x), 'y_sh': complex(0.0, b_sh)})

    return barras, lineas, S_base, "SISTEMA INGRESADO MANUALMENTE", None


def main():
    print("=" * 95)
    print("  SOLUCIONADOR DE FLUJO DE POTENCIA - MÉTODO DE GAUSS-SEIDEL")
    print("=" * 95)
    print("1. Ejemplo 9.2 de Grainger & Stevenson (4 barras, Base 100 MVA)")
    print("2. Sistema de ejemplo de 3 barras")
    print("3. Ingresar datos del sistema manualmente")
    opcion = input("Seleccione una opción (1, 2 o 3): ").strip()

    if opcion == '3':
        barras, lineas, S_base, titulo, indicaciones = ingresar_sistema_manual()
    elif opcion == '2':
        barras, lineas, S_base, titulo, indicaciones = cargar_sistema_ejemplo_3_barras()
    else:
        barras, lineas, S_base, titulo, indicaciones = cargar_ejemplo_stevenson_9_2()

    mostrar_datos_entrada(barras, lineas, S_base, titulo_sistema=titulo, indicaciones=indicaciones)

    while True:
        try:
            n_iter = int(input("\n¿Cuántas iteraciones se necesitan / máximo de iteraciones?: "))
            if n_iter > 0:
                break
            print("Por favor ingrese un entero positivo.")
        except ValueError:
            print("Entrada inválida. Ingrese un número entero.")

    tol_str = input("Ingrese la tolerancia ε (Enter para 1e-6, o 0 para ejecutar todas las iteraciones): ").strip()
    tol = float(tol_str) if tol_str != "" else 1e-6

    alpha_str = input("Ingrese el factor de aceleración α (Enter para 1.0, sin aceleración): ").strip()
    alpha = float(alpha_str) if alpha_str != "" else 1.0

    resultados = resolver_flujo_gauss_seidel(barras, lineas, n_iter=n_iter, tol=tol, alpha=alpha, mostrar_iter=True)
    imprimir_reporte(barras, resultados, S_base=S_base)

    ver_pasos = input("\n¿Desea ver el procedimiento paso a paso (fórmulas con valores y respuestas cortas) de las tensiones? (s/n): ").strip().lower()
    if ver_pasos in ('s', 'si', 'sí'):
        imprimir_paso_a_paso_tensiones(resultados['historial_pasos'])


if __name__ == "__main__":
    main()