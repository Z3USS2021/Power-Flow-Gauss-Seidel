import test from 'node:test';
import assert from 'node:assert/strict';
import { Complex, fmtC, fmtPol } from './complex';
import {
  cargarEjemploStevenson92,
  cargarSistemaEjemplo3Barras,
  crearSistemaManual,
} from './presets';
import {
  construirYbus,
  resolverFlujoGaussSeidel,
  validarSistema,
} from './powerFlow';

test('Complex arithmetic and formatting helpers behave cleanly without -0.0000', () => {
  const z = new Complex(-0.000001, -0.000001);
  assert.equal(fmtC(z, 4), '(0.0000+0.0000j)');
  assert.equal(fmtPol(new Complex(1.0, 0), 5, 2), '1.00000∠+0.00°');

  const a = new Complex(3, 4);
  const b = new Complex(1, -2);
  assert.equal(a.abs, 5);
  assert.equal(a.add(b).re, 4);
  assert.equal(a.add(b).im, 2);
  const div = a.div(b);
  assert.ok(Math.abs(div.re - -1) < 1e-12);
  assert.ok(Math.abs(div.im - 2) < 1e-12);
});

test('Ejemplo 9.2 Grainger & Stevenson converges in 16 iterations at tol=1e-6 and balances power', () => {
  const preset = cargarEjemploStevenson92();
  const validation = validarSistema(preset.barras, preset.lineas, preset.S_base);
  assert.equal(validation.valid, true);

  const { Ybus } = construirYbus(preset.barras, preset.lineas);
  // Check symmetry of Ybus
  assert.ok(Math.abs(Ybus[0][1].re - Ybus[1][0].re) < 1e-12);
  assert.ok(Math.abs(Ybus[0][1].im - Ybus[1][0].im) < 1e-12);

  const res = resolverFlujoGaussSeidel(preset.barras, preset.lineas, 30, 1e-6, 1.0);
  assert.equal(res.convergido, true);
  assert.ok(res.iter_realizadas <= 20, `Expected <= 20 iterations, got ${res.iter_realizadas}`);
  assert.ok(res.max_error <= 1e-6);

  // Check Slack voltage fixed
  assert.ok(Math.abs(res.V[0].abs - 1.0) < 1e-9);
  assert.ok(Math.abs(res.V[0].angleDeg - 0.0) < 1e-9);

  // Check PV bus 4 magnitude fixed at 1.02
  assert.ok(Math.abs(res.V[3].abs - 1.02) < 1e-9);

  // Check Stevenson 9.2 reference voltages approx:
  // |V2| ≈ 0.9824, angle ≈ -0.976 deg; |V3| ≈ 0.9690, angle ≈ -1.872 deg
  assert.ok(Math.abs(res.V[1].abs - 0.9824) < 1e-3);
  assert.ok(Math.abs(res.V[2].abs - 0.9690) < 1e-3);

  // Check power balance: sum(PG) == sum(PD) + P_perd_total
  const pGenMinusLoadLoss = res.PG_total - (res.PD_total + res.S_perd_total.re);
  const qGenMinusLoadLoss = res.QG_total - (res.QD_total + res.S_perd_total.im);
  assert.ok(Math.abs(pGenMinusLoadLoss) < 1e-5);
  assert.ok(Math.abs(qGenMinusLoadLoss) < 1e-5);

  // Check step-by-step history captured for every iteration
  assert.equal(res.historial_pasos.length, res.iter_realizadas);
  assert.equal(res.historial_pasos[0].pasos.length, 3); // buses 2, 3, 4 (excludes Slack)
});

test('Sistema de ejemplo de 3 barras respects PV reactive limits and converges', () => {
  const preset = cargarSistemaEjemplo3Barras();
  const res = resolverFlujoGaussSeidel(preset.barras, preset.lineas, 50, 1e-6, 1.0);
  assert.equal(res.convergido, true);
  assert.ok(Math.abs(res.PG_total - (res.PD_total + res.S_perd_total.re)) < 1e-4);
  assert.ok(Math.abs(res.QG_total - (res.QD_total + res.S_perd_total.im)) < 1e-4);
});

test('tol=0 executes exact number of requested iterations without early stopping', () => {
  const preset = cargarEjemploStevenson92();
  const res = resolverFlujoGaussSeidel(preset.barras, preset.lineas, 5, 0, 1.2);
  assert.equal(res.iter_realizadas, 5);
  assert.equal(res.convergido, false);
  assert.equal(res.historial_pasos.length, 5);
});

test('validarSistema catches missing Slack, isolated bus, and zero impedance', () => {
  const manual = crearSistemaManual(3, 1, 100);
  // Bus 3 is isolated because only 1 line (1-2) exists
  const v1 = validarSistema(manual.barras, manual.lineas, 100);
  assert.equal(v1.valid, false);
  assert.ok(v1.errors.some((e) => e.includes('aislada')));

  // Remove slack
  manual.barras[0].tipo = 'PQ';
  manual.lineas[0].r = 0;
  manual.lineas[0].x = 0;
  const v2 = validarSistema(manual.barras, manual.lineas, 100);
  assert.equal(v2.valid, false);
  assert.ok(v2.errors.some((e) => e.includes('Slack')));
  assert.ok(v2.errors.some((e) => e.includes('no puede ser cero')));
});
