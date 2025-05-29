
import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Send, Download, Trash2, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FlowReading {
  id: string;
  timestamp: string;
  duration: number;
  volume: number;
  gpm: number;
  operatorName: string;
  deepweel9: number;
  deepweel10: number;
  notes?: string;
}

const GPMCalculator = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [volume, setVolume] = useState<number>(0);
  const [gpm, setGPM] = useState<number>(0);
  const [flowLog, setFlowLog] = useState<FlowReading[]>([]);
  const [notes, setNotes] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [deepweel9, setDeepweel9] = useState<number>(0);
  const [deepweel10, setDeepweel10] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { toast } = useToast();

  // Stopwatch functionality
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => setTime(time => time + 1), 10);
    }
    return () => clearInterval(intervalId);
  }, [isRunning]);

  // Calculate GPM using your formula: GPM = (1/seconds) × 3600 × 4.4
  useEffect(() => {
    if (time > 0) {
      const seconds = time / 100; // Convert centiseconds to seconds
      const calculatedGPM = (1 / seconds) * 3600 * 4.4;
      setGPM(Number(calculatedGPM.toFixed(2)));
    } else {
      setGPM(0);
    }
  }, [time]);

  // Load flow log from Firebase
  useEffect(() => {
    loadFlowLog();
  }, []);

  const loadFlowLog = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'flowReadings'));
      const readings: FlowReading[] = [];
      querySnapshot.forEach((doc) => {
        readings.push({ id: doc.id, ...doc.data() } as FlowReading);
      });
      readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFlowLog(readings);
    } catch (error) {
      console.error('Error loading flow log:', error);
    }
  };

  const startStopwatch = () => {
    setIsRunning(true);
  };

  const stopStopwatch = () => {
    setIsRunning(false);
    // Auto-log when stopping the stopwatch
    if (time > 0) {
      autoLogReading();
    }
  };

  const resetStopwatch = () => {
    setTime(0);
    setIsRunning(false);
    setGPM(0);
  };

  const autoLogReading = async () => {
    if (time === 0) {
      return;
    }

    if (!operatorName.trim()) {
      toast({
        title: "Error",
        description: "Please enter operator name before stopping the timer",
        variant: "destructive"
      });
      return;
    }

    const reading: Omit<FlowReading, 'id'> = {
      timestamp: new Date().toISOString(),
      duration: time / 100, // Convert to seconds
      volume,
      gpm,
      operatorName: operatorName.trim(),
      deepweel9,
      deepweel10,
      notes: notes || undefined
    };

    try {
      await addDoc(collection(db, 'flowReadings'), reading);
      await loadFlowLog();
      setNotes('');
      resetStopwatch();
      toast({
        title: "Success",
        description: "Reading auto-logged successfully"
      });
    } catch (error) {
      console.error('Error auto-logging reading:', error);
      toast({
        title: "Error",
        description: "Failed to auto-log reading",
        variant: "destructive"
      });
    }
  };

  const sendToAdmin = async () => {
    try {
      await addDoc(collection(db, 'adminReports'), {
        timestamp: new Date().toISOString(),
        flowReadings: flowLog,
        totalReadings: flowLog.length,
        averageGPM: flowLog.length > 0 ? flowLog.reduce((sum, reading) => sum + reading.gpm, 0) / flowLog.length : 0
      });
      
      toast({
        title: "Success",
        description: "Data sent to admin panel successfully"
      });
    } catch (error) {
      console.error('Error sending to admin:', error);
      toast({
        title: "Error", 
        description: "Failed to send data to admin",
        variant: "destructive"
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Operator Name', 'Duration (seconds)', 'Volume', 'GPM', 'Deepweel 9', 'Deepweel 10', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...flowLog.map(reading => [
        reading.timestamp,
        reading.operatorName,
        reading.duration,
        reading.volume,
        reading.gpm,
        reading.deepweel9,
        reading.deepweel10,
        reading.notes || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gpm-readings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearAllData = async () => {
    try {
      for (const reading of flowLog) {
        await deleteDoc(doc(db, 'flowReadings', reading.id));
      }
      await loadFlowLog();
      toast({
        title: "Success",
        description: "All data cleared successfully"
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive"
      });
    }
  };

  const formatTime = (centiseconds: number) => {
    const totalSeconds = Math.floor(centiseconds / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const cs = centiseconds % 100;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            GPM Flow Calculator
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={isDarkMode ? 'text-white border-gray-600' : ''}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calculator Section */}
          <div className="space-y-6">
            {/* Stopwatch Card */}
            <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : ''}>Stopwatch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-6xl font-mono font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {formatTime(time)}
                  </div>
                </div>
                <div className="flex justify-center space-x-2">
                  <Button
                    onClick={startStopwatch}
                    disabled={isRunning}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    onClick={stopStopwatch}
                    disabled={!isRunning}
                    variant="destructive"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop & Auto-Log
                  </Button>
                  <Button onClick={resetStopwatch} variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* GPM Display Card */}
            <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : ''}>Flow Rate (GPM)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {gpm} GPM
                  </div>
                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Formula: GPM = (1/seconds) × 3600 × 4.4
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Input and Controls Card */}
            <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : ''}>Reading Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="operatorName" className={isDarkMode ? 'text-gray-300' : ''}>
                    Operator Name *
                  </Label>
                  <Input
                    id="operatorName"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Enter operator name"
                    className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="volume" className={isDarkMode ? 'text-gray-300' : ''}>
                      Volume (gallons)
                    </Label>
                    <Input
                      id="volume"
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      placeholder="Enter volume"
                      className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deepweel9" className={isDarkMode ? 'text-gray-300' : ''}>
                      Deepweel 9
                    </Label>
                    <Input
                      id="deepweel9"
                      type="number"
                      value={deepweel9}
                      onChange={(e) => setDeepweel9(Number(e.target.value))}
                      placeholder="Enter deepweel 9"
                      className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="deepweel10" className={isDarkMode ? 'text-gray-300' : ''}>
                    Deepweel 10
                  </Label>
                  <Input
                    id="deepweel10"
                    type="number"
                    value={deepweel10}
                    onChange={(e) => setDeepweel10(Number(e.target.value))}
                    placeholder="Enter deepweel 10"
                    className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className={isDarkMode ? 'text-gray-300' : ''}>
                    Notes (optional)
                  </Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this reading"
                    className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <Button onClick={sendToAdmin} variant="outline" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send to Admin
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Data Log Section */}
          <div>
            <Card className={isDarkMode ? 'bg-gray-800 border-gray-700' : ''}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className={isDarkMode ? 'text-white' : ''}>
                    Flow Readings ({flowLog.length})
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button onClick={clearAllData} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {flowLog.length === 0 ? (
                    <p className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No readings logged yet
                    </p>
                  ) : (
                    flowLog.map((reading) => (
                      <div
                        key={reading.id}
                        className={`p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {reading.gpm} GPM - {reading.operatorName}
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Duration: {reading.duration}s | Volume: {reading.volume} gal
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Deepweel 9: {reading.deepweel9} | Deepweel 10: {reading.deepweel10}
                            </div>
                            {reading.notes && (
                              <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {reading.notes}
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(reading.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPMCalculator;
