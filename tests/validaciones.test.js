// "npm test": prueba las funciones puras (no necesita base de datos ni internet).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarLuhn, detectarMarca, validarVencimiento, validarCorreo, validarCelular,
  validarLogin, validarRegistro, validarNuevaIncidencia, validarContacto, validarPagoTarjeta,
  validarCobroCaja, exigirValido, idDeRuta, enmascararTarjeta,
} from '../src/utils/validaciones.js';
import { calcularMontoServicio, estadoPagoInicial } from '../src/utils/tarifario.js';

const reporte = {
  tipo_incidente: 'Robo o asalto', sector: 'Zona 1 — Huancayo Centro', direccion: 'Jr. Real 456',
  descripcion: 'Asaltaron a una persona en la esquina', telefono: '987654321',
};

test('Luhn y marca de tarjeta', () => {
  assert.equal(validarLuhn('4111 1111 1111 1111'), true);
  assert.equal(validarLuhn('4111 1111 1111 1112'), false);
  assert.equal(detectarMarca('4111111111111111'), 'Visa');
  assert.equal(detectarMarca('5555555555554444'), 'Mastercard');
  assert.equal(detectarMarca('378282246310005'), 'American Express');
  assert.equal(enmascararTarjeta('4111 1111 1111 1234'), '**** 1234');
});

test('vencimiento: válido, vencido y mal formato', () => {
  const hoy = new Date(2026, 10, 25);
  assert.deepEqual(validarVencimiento('12/29', hoy), { mes: 12, anio: 2029 });
  assert.equal(validarVencimiento('01/20', hoy), null);
  assert.equal(validarVencimiento('13/29', hoy), null);
  assert.equal(validarVencimiento('1229', hoy), null);
});

test('correo y celular', () => {
  assert.equal(validarCorreo('vecino@correo.com'), true);
  assert.equal(validarCorreo('sin-arroba'), false);
  assert.equal(validarCelular('987654321'), true);
  assert.equal(validarCelular('887654321'), false);
  assert.equal(validarCelular('98765'), false);
});

test('login vacío o con correo inválido produce errores (400)', () => {
  assert.ok(validarLogin({}).correo);
  assert.ok(validarLogin({ correo: 'a@b.com' }).contrasena);
  assert.ok(validarLogin({ correo: 'mal', contrasena: 'x' }).correo);
  assert.deepEqual(validarLogin({ correo: 'a@b.com', contrasena: 'x' }), {});
  assert.throws(() => exigirValido(validarLogin({})), (e) => e.status === 400);
});

test('registro: contraseña corta y nombre inválido', () => {
  assert.ok(validarRegistro({ nombre: 'J', correo: 'a@b.com', contrasena: '1234' }).nombre);
  assert.ok(validarRegistro({ nombre: 'Juan Pérez', correo: 'a@b.com', contrasena: '12' }).contrasena);
  assert.deepEqual(validarRegistro({ nombre: 'Juan Pérez', correo: 'a@b.com', contrasena: '1234' }), {});
});

test('reporte: auxilio, resguardo y datos fuera de rango', () => {
  assert.deepEqual(validarNuevaIncidencia({ ...reporte, horas_resguardo: 0 }), {});
  assert.deepEqual(validarNuevaIncidencia({ ...reporte, horas_resguardo: 3, efectivos_adicionales: 2 }), {});
  assert.ok(validarNuevaIncidencia({ ...reporte, tipo_incidente: 'Inventado' }).tipo_incidente);
  assert.ok(validarNuevaIncidencia({ ...reporte, horas_resguardo: 99 }).horas_resguardo);
  assert.ok(validarNuevaIncidencia({ ...reporte, horas_resguardo: 1.5 }).horas_resguardo);
  assert.ok(validarNuevaIncidencia({ ...reporte, telefono: '123' }).telefono);
  assert.ok(validarNuevaIncidencia({ ...reporte, descripcion: 'corta' }).descripcion);
});

test('tarifa: S/ 50 por hora + S/ 20 por efectivo; auxilio gratis', () => {
  assert.equal(calcularMontoServicio({ horas_resguardo: 4, efectivos_adicionales: 2 }), 240);
  assert.equal(calcularMontoServicio({ horas_resguardo: 0, efectivos_adicionales: 5 }), 0);
  assert.equal(estadoPagoInicial(0), 'exonerado');
  assert.equal(estadoPagoInicial(50), 'pendiente');
});

test('contacto: correo inválido y asunto fuera de la lista', () => {
  const ok = { nombres: 'Juan', apellidos: 'Pérez', telefono: '964123456', correo: 'j@p.com', asunto: 'Queja o Reclamo', mensaje: 'Mensaje con detalle' };
  assert.deepEqual(validarContacto(ok), {});
  assert.ok(validarContacto({ ...ok, correo: 'x' }).correo);
  assert.ok(validarContacto({ ...ok, asunto: 'Otro' }).asunto);
  assert.ok(validarContacto({ ...ok, dni: '123' }).dni);
});

test('pago con tarjeta y cobro en caja', () => {
  const t = { id_registro: 1, numero: '4111111111111111', vencimiento: '12/39', cvv: '123', titular: 'JUAN PEREZ' };
  assert.deepEqual(validarPagoTarjeta(t).errores, {});
  assert.ok(validarPagoTarjeta({ ...t, cvv: '12' }).errores.cvv);
  assert.deepEqual(validarCobroCaja({ id_registro: 1, metodo: 'efectivo', monto_recibido: 100 }), {});
  assert.ok(validarCobroCaja({ id_registro: 1, metodo: 'efectivo' }).monto_recibido);
  assert.ok(validarCobroCaja({ id_registro: 1, metodo: 'pos', referencia: '1' }).referencia);
  assert.ok(validarCobroCaja({ id_registro: 1, metodo: 'cheque' }).metodo);
});

test('idDeRuta rechaza valores raros', () => {
  assert.equal(idDeRuta('7'), 7);
  for (const malo of ['0', '-1', 'abc', '1.5', '99999999999']) assert.throws(() => idDeRuta(malo), (e) => e.status === 400);
});
