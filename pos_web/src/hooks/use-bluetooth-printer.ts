'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  connectBluetoothPrinter,
  printReceiptBluetooth,
  isBluetoothSupported,
  type BluetoothPrinterConnection,
} from '@/lib/bluetooth-printer';
import type { ReceiptDetailResponse } from '@/types/receipt';

export type PrinterStatus = 'idle' | 'connecting' | 'connected' | 'printing' | 'error';

export function useBluetoothPrinter() {
  const [status, setStatus] = useState<PrinterStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const connRef = useRef<BluetoothPrinterConnection | null>(null);

  useEffect(() => {
    setSupported(isBluetoothSupported());
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    try {
      const conn = await connectBluetoothPrinter();
      connRef.current = conn;
      setDeviceName(conn.device.name ?? 'Printer');
      setStatus('connected');

      conn.device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle');
        setDeviceName(null);
        connRef.current = null;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke printer';
      setError(msg);
      setStatus('error');
    }
  }, []);

  const disconnect = useCallback(() => {
    connRef.current?.disconnect();
    connRef.current = null;
    setStatus('idle');
    setDeviceName(null);
    setError(null);
  }, []);

  const print = useCallback(async (receipt: ReceiptDetailResponse) => {
    if (!connRef.current) {
      setError('Printer belum terhubung');
      setStatus('error');
      return;
    }
    setStatus('printing');
    setError(null);
    try {
      await printReceiptBluetooth(connRef.current, receipt);
      setStatus('connected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mencetak';
      setError(msg);
      setStatus('connected');
    }
  }, []);

  const connectAndPrint = useCallback(async (receipt: ReceiptDetailResponse) => {
    if (connRef.current) {
      // already connected, go straight to print
      setStatus('printing');
      setError(null);
      try {
        await printReceiptBluetooth(connRef.current, receipt);
        setStatus('connected');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal mencetak';
        setError(msg);
        setStatus('connected');
      }
      return;
    }

    setStatus('connecting');
    setError(null);
    try {
      const conn = await connectBluetoothPrinter();
      connRef.current = conn;
      setDeviceName(conn.device.name ?? 'Printer');

      conn.device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle');
        setDeviceName(null);
        connRef.current = null;
      });

      setStatus('printing');
      await printReceiptBluetooth(conn, receipt);
      setStatus('connected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung atau mencetak';
      setError(msg);
      setStatus('error');
    }
  }, []);

  return { status, error, deviceName, supported, connect, disconnect, print, connectAndPrint };
}
