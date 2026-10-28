import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Play, 
  Square, 
  Send, 
  Gauge, 
  Thermometer, 
  Droplets, 
  Activity, 
  Zap,
  ArrowRight,
  Database,
  Cloud,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { IoTTelemetryPayload, FileContentRecord, UserFileRecord, UploadEventRecord } from '../types';
import { computeMD5FromString, formatBytes } from '../utils/md5';

interface IoTSimulatorViewProps {
  ownerId: string;
  contents: FileContentRecord[];
  onAddUpload: (
    newContent: FileContentRecord | null,
    newUserFile: UserFileRecord,
    newEvent: UploadEventRecord,
    isDuplicate: boolean
  ) => void;
}

export const IoTSimulatorView: React.FC<IoTSimulatorViewProps> = ({
  ownerId,
  contents,
  onAddUpload,
}) => {
  const [selectedDevice, setSelectedDevice] = useState('IOT-NODE-01-LAB');
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json');
  const [isContinuous, setIsContinuous] = useState(false);
  const [intervalMs] = useState(3000);
  const [repeatMode, setRepeatMode] = useState(false);
  
  // Readings history for live SVG wave chart
  const [telemetryHistory, setTelemetryHistory] = useState<Array<{ temp: number; hum: number; time: string }>>([
    { temp: 24.2, hum: 54.0, time: '10:00:00' },
    { temp: 24.5, hum: 55.1, time: '10:00:03' },
    { temp: 24.8, hum: 56.0, time: '10:00:06' },
    { temp: 25.1, hum: 55.8, time: '10:00:09' },
    { temp: 24.9, hum: 54.9, time: '10:00:12' },
  ]);

  const [logHistory, setLogHistory] = useState<Array<{
    timestamp: string;
    filename: string;
    md5: string;
    isDuplicate: boolean;
    size: number;
    temp: number;
    humidity: number;
    status: string;
  }>>([]);

  const [currentReading, setCurrentReading] = useState<IoTTelemetryPayload>({
    device_id: 'IOT-NODE-01-LAB',
    device_type: 'Environmental_Telemetry_Node',
    timestamp: new Date().toISOString(),
    temperature_celsius: 24.5,
    humidity_percentage: 55.2,
    pressure_hpa: 1013.25,
    battery_pct: 98.4,
    sensor_status: 'NOMINAL',
    firmware_version: 'v2.4.1',
    transmission_channel: 'MQTT_TLS',
  });

  const lastPayloadRef = useRef<IoTTelemetryPayload | null>(null);

  const generateReading = (forceRepeat: boolean = false): IoTTelemetryPayload => {
    if (forceRepeat && lastPayloadRef.current) {
      return { ...lastPayloadRef.current };
    }

    const temp = +(21 + Math.random() * 10).toFixed(2);
    const hum = +(48 + Math.random() * 28).toFixed(2);
    const reading: IoTTelemetryPayload = {
      device_id: selectedDevice,
      device_type: 'Environmental_Telemetry_Node',
      timestamp: new Date().toISOString(),
      temperature_celsius: temp,
      humidity_percentage: hum,
      pressure_hpa: +(1011 + Math.random() * 5).toFixed(2),
      battery_pct: +(94 + Math.random() * 5).toFixed(1),
      sensor_status: temp > 29 || hum > 72 ? 'WARNING' : 'NOMINAL',
      firmware_version: 'v2.4.1',
      transmission_channel: 'MQTT_TLS',
    };
    lastPayloadRef.current = reading;
    return reading;
  };

  const transmitTelemetryLog = (forceRepeat: boolean = false) => {
    const payload = generateReading(forceRepeat);
    setCurrentReading(payload);

    setTelemetryHistory(prev => [
      ...prev.slice(-14),
      { temp: payload.temperature_celsius, hum: payload.humidity_percentage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
    ]);

    let contentStr = '';
    let filename = '';
    let mime = '';

    if (selectedFormat === 'json') {
      contentStr = JSON.stringify(payload, null, 2);
      filename = `${selectedDevice.toLowerCase()}_${payload.timestamp.slice(11, 19).replace(/:/g, '')}.json`;
      mime = 'application/json';
    } else {
      contentStr = `device_id,timestamp,temperature_celsius,humidity_percentage,pressure_hpa,sensor_status\n${payload.device_id},${payload.timestamp},${payload.temperature_celsius},${payload.humidity_percentage},${payload.pressure_hpa},${payload.sensor_status}\n`;
      filename = `${selectedDevice.toLowerCase()}_${payload.timestamp.slice(11, 19).replace(/:/g, '')}.csv`;
      mime = 'text/csv';
    }

    const md5Hash = computeMD5FromString(contentStr);
    const size = new TextEncoder().encode(contentStr).length;

    const existing = contents.find(c => c.owner_id === ownerId && c.md5_hash === md5Hash);
    const now = new Date().toISOString();
    const userFileId = `uf-iot-${Date.now()}`;

    if (existing) {
      const userFile: UserFileRecord = {
        id: userFileId,
        owner_id: ownerId,
        original_filename: filename,
        content_id: existing.id,
        mime_type: mime,
        upload_date: now,
        is_duplicate: true,
        md5_hash: md5Hash,
        file_size: size,
        reference_count: existing.reference_count + 1,
      };

      const event: UploadEventRecord = {
        id: `ev-iot-${Date.now()}`,
        owner_id: ownerId,
        filename,
        event_type: 'UPLOAD_DUPLICATE',
        file_size: size,
        md5_hash: md5Hash,
        created_at: now,
      };

      onAddUpload(null, userFile, event, true);

      setLogHistory(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          filename,
          md5: md5Hash,
          isDuplicate: true,
          size,
          temp: payload.temperature_celsius,
          humidity: payload.humidity_percentage,
          status: payload.sensor_status,
        },
        ...prev.slice(0, 19),
      ]);
    } else {
      const contentId = `cnt-iot-${Date.now()}`;
      const newContent: FileContentRecord = {
        id: contentId,
        owner_id: ownerId,
        md5_hash: md5Hash,
        file_size: size,
        storage_path: `${ownerId}/${md5Hash}`,
        reference_count: 1,
        created_at: now,
        dataUrl: `data:${mime};charset=utf-8,` + encodeURIComponent(contentStr),
      };

      const userFile: UserFileRecord = {
        id: userFileId,
        owner_id: ownerId,
        original_filename: filename,
        content_id: contentId,
        mime_type: mime,
        upload_date: now,
        is_duplicate: false,
        md5_hash: md5Hash,
        file_size: size,
        reference_count: 1,
      };

      const event: UploadEventRecord = {
        id: `ev-iot-${Date.now()}`,
        owner_id: ownerId,
        filename,
        event_type: 'UPLOAD_NEW',
        file_size: size,
        md5_hash: md5Hash,
        created_at: now,
      };

      onAddUpload(newContent, userFile, event, false);

      setLogHistory(prev => [
        {
          timestamp: new Date().toLocaleTimeString(),
          filename,
          md5: md5Hash,
          isDuplicate: false,
          size,
          temp: payload.temperature_celsius,
          humidity: payload.humidity_percentage,
          status: payload.sensor_status,
        },
        ...prev.slice(0, 19),
      ]);
    }
  };

  useEffect(() => {
    let timer: any;
    if (isContinuous) {
      timer = setInterval(() => {
        transmitTelemetryLog(repeatMode);
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isContinuous, intervalMs, repeatMode, selectedDevice, selectedFormat, contents]);

  // SVG Wave chart calculations for temperature
  const wavePoints = telemetryHistory.map((pt, i) => {
    const x = (i / Math.max(1, telemetryHistory.length - 1)) * 320;
    const y = 80 - ((pt.temp - 15) / 25) * 60;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            IoT Edge Sensor Node &amp; Deduplication Simulation
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Simulates periodic environmental telemetry logs. When readings remain static or repeated, the MD5 engine intercepts redundant files before cloud storage writes.
          </p>
        </div>
      </div>

      {/* Edge-to-Cloud Pipeline Visual Flow */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="text-xs font-semibold text-slate-700 mb-3">Edge Ingestion Pipeline Flow</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Cpu className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900">1. Edge Node</div>
              <div className="text-[11px] text-slate-500">Collects temp &amp; hum readings</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900">2. MD5 Fingerprint</div>
              <div className="text-[11px] text-slate-500">Calculates 128-bit digest</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <div className="font-semibold text-slate-900">3. PostgreSQL Query</div>
              <div className="text-[11px] text-slate-500">Checks (owner_id, hash)</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/70 flex items-center gap-3">
            <Cloud className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-semibold text-emerald-900">4. Deduplication</div>
              <div className="text-[11px] text-emerald-700">Reuses blob if repeated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Device Panel & Simulated Instrument */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Device Hardware Profile & Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hardware Photo Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="relative h-44 bg-slate-100 overflow-hidden">
              <img
                src="/src/assets/images/iot_environmental_sensor_1793182678034.jpg"
                alt="IoT Environmental Telemetry Node Hardware"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Simulated Hardware
                </span>
                <div className="text-sm font-bold">{selectedDevice}</div>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Target Virtual Sensor Device</label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 cursor-pointer text-xs"
                >
                  <option value="IOT-NODE-01-LAB">IOT-NODE-01-LAB (Laboratory Bench)</option>
                  <option value="IOT-CHAMBER-202">IOT-CHAMBER-202 (Thermal Chamber)</option>
                  <option value="IOT-GATEWAY-ALPHA">IOT-GATEWAY-ALPHA (Field Gateway)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Log Serialization Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedFormat('json')}
                    className={`py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                      selectedFormat === 'json'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    JSON Payload
                  </button>
                  <button
                    onClick={() => setSelectedFormat('csv')}
                    className={`py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                      selectedFormat === 'csv'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    CSV Row
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatMode}
                    onChange={(e) => setRepeatMode(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Force Duplicate Telemetry</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5 ml-5">
                  Sends deterministically identical payload bytes to prove duplicate suppression.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => transmitTelemetryLog(repeatMode)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Emit Single Telemetry Reading</span>
                </button>

                <button
                  onClick={() => setIsContinuous(!isContinuous)}
                  className={`w-full py-2 font-semibold rounded-lg border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    isContinuous
                      ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isContinuous ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Continuous Ingestion (3s)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Continuous Feed (3s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Tech Telemetry Instrument Monitor */}
        <div className="lg:col-span-7 bg-slate-950 rounded-xl p-6 text-white shadow-md border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold">{currentReading.sensor_status}</span>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="text-slate-300">{currentReading.device_id}</span>
              </div>
              <span className="text-slate-500">{currentReading.firmware_version}</span>
            </div>

            {/* Readout Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-5">
              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-mono">TEMPERATURE</span>
                  <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {currentReading.temperature_celsius.toFixed(1)}°C
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-mono">HUMIDITY</span>
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {currentReading.humidity_percentage.toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-mono">PRESSURE</span>
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {currentReading.pressure_hpa}
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-mono">BATTERY</span>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">
                  {currentReading.battery_pct}%
                </div>
              </div>
            </div>

            {/* Live SVG Waveform */}
            <div className="bg-slate-900/60 rounded-lg p-3.5 border border-slate-800/80 mb-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                <span>TEMPERATURE TELEMETRY OSCILLOGRAPH</span>
                <span className="text-emerald-400">REALTIME MONITOR</span>
              </div>
              <svg className="w-full h-20 overflow-visible" viewBox="0 0 320 80">
                {/* Horizontal Guide Lines */}
                <line x1="0" y1="20" x2="320" y2="20" stroke="#334155" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="320" y2="50" stroke="#334155" strokeDasharray="3 3" />
                {/* Polyline Wave */}
                <polyline
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={wavePoints}
                />
              </svg>
            </div>
          </div>

          {/* Transmitted Payload JSON Preview */}
          <div className="bg-black/70 rounded-lg p-3 text-[11px] font-mono text-emerald-400 border border-slate-800/80 overflow-x-auto">
            <div className="text-slate-500 mb-1 text-[10px]">CURRENT FINGERPRINT: {computeMD5FromString(JSON.stringify(currentReading))}</div>
            <pre className="text-slate-300">
              {JSON.stringify(currentReading, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Live Ingestion Log Feed */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>IoT Ingestion Log Stream</span>
          </div>
          <span className="text-xs text-slate-500 font-mono font-normal">
            {logHistory.length} logs transmitted
          </span>
        </h2>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {logHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Emit a telemetry reading to observe live cloud deduplication in action.
            </div>
          ) : (
            logHistory.map((log, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    log.isDuplicate
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {log.isDuplicate ? 'DEDUPLICATED (REUSED)' : 'STORED (NEW BLOB)'}
                  </span>
                  <span className="font-mono text-slate-800">{log.filename}</span>
                </div>

                <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                  <span>{log.temp}°C / {log.humidity}%</span>
                  <span>hash:{log.md5.slice(0, 8)}...</span>
                  <span>{formatBytes(log.size)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
