
import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Send, Download, Trash2, Moon, Sun, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FlowReading {
  id: string;
  timestamp: string;
  duration: number;
  gpm: number;
  operatorName: string;
  deepwell9: number;
  deepwell10: number;
  notes?: string;
}

const GPMCalculator = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gpm, setGPM] = useState<number>(0);
  const [flowLog, setFlowLog] = useState<FlowReading[]>([]);
  const [notes, setNotes] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [deepwell9, setDeepwell9] = useState<string>('');
  const [deepwell10, setDeepwell10] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
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

  // Real-time validation
  useEffect(() => {
    validateInputs();
  }, [operatorName, deepwell9, deepwell10]);

  const validateInputs = () => {
    const errors: {[key: string]: string} = {};
    
    if (!operatorName.trim()) {
      errors.operatorName = 'Operator name is required';
    } else if (operatorName.trim().length < 2) {
      errors.operatorName = 'Operator name must be at least 2 characters';
    }
    
    if (deepwell9 && (isNaN(Number(deepwell9)) || Number(deepwell9) < 0)) {
      errors.deepwell9 = 'Must be a positive number';
    }
    
    if (deepwell10 && (isNaN(Number(deepwell10)) || Number(deepwell10) < 0)) {
      errors.deepwell10 = 'Must be a positive number';
    }
    
    setValidationErrors(errors);
  };

  const loadFlowLog = async () => {
    setIsLoading(true);
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
      toast({
        title: "Error",
        description: "Failed to load readings",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix all validation errors before logging",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const reading: Omit<FlowReading, 'id'> = {
      timestamp: new Date().toISOString(),
      duration: time / 100, // Convert to seconds
      gpm,
      operatorName: operatorName.trim(),
      deepwell9: Number(deepwell9) || 0,
      deepwell10: Number(deepwell10) || 0,
      notes: notes || undefined
    };

    try {
      await addDoc(collection(db, 'flowReadings'), reading);
      await loadFlowLog();
      setNotes('');
      setDeepwell9('');
      setDeepwell10('');
      resetStopwatch();
      toast({
        title: "Success",
        description: "Reading auto-logged successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error auto-logging reading:', error);
      toast({
        title: "Error",
        description: "Failed to auto-log reading",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendToAdmin = async () => {
    setIsSending(true);
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
    } finally {
      setIsSending(false);
    }
  };

  const exportToCSV = () => {
    setIsExporting(true);
    
    setTimeout(() => {
      const headers = ['Timestamp', 'Operator Name', 'Duration (seconds)', 'GPM', 'Deepwell 9', 'Deepwell 10', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...flowLog.map(reading => [
          reading.timestamp,
          reading.operatorName,
          reading.duration,
          reading.gpm,
          reading.deepwell9,
          reading.deepwell10,
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
      setIsExporting(false);
      
      toast({
        title: "Success",
        description: "CSV exported successfully"
      });
    }, 1000);
  };

  const clearAllData = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (centiseconds: number) => {
    const totalSeconds = Math.floor(centiseconds / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const cs = centiseconds % 100;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  const getInputValidationStyle = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      return isDarkMode 
        ? 'bg-red-900/20 border-red-500 text-white focus:border-red-400' 
        : 'bg-red-50 border-red-300 focus:border-red-400';
    }
    return isDarkMode 
      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400' 
      : 'focus:border-blue-400';
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ease-in-out ${isDarkMode ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'}`}>
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
          <h1 className={`text-4xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' : 'text-gray-900'}`}>
            GPM Flow Calculator
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`transition-all duration-300 hover:scale-110 ${isDarkMode ? 'text-yellow-400 border-gray-600 hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calculator Section */}
          <div className="space-y-6">
            {/* Stopwatch Card */}
            <Card className={`transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${isDarkMode ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
              <CardHeader>
                <CardTitle className={`text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Precision Stopwatch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center relative">
                  <div className={`text-7xl font-mono font-bold transition-all duration-300 ${
                    isRunning 
                      ? (isDarkMode ? 'text-green-400 animate-pulse' : 'text-green-600 animate-pulse')
                      : (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                  }`}>
                    {formatTime(time)}
                  </div>
                  {isRunning && (
                    <div className="absolute -top-2 -right-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button
                    onClick={startStopwatch}
                    disabled={isRunning || isLoading}
                    className="bg-green-600 hover:bg-green-700 transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    onClick={stopStopwatch}
                    disabled={!isRunning || isLoading}
                    variant="destructive"
                    className="transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Square className="h-4 w-4 mr-2" />}
                    Stop & Auto-Log
                  </Button>
                  <Button 
                    onClick={resetStopwatch} 
                    variant="outline"
                    className="transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* GPM Display Card */}
            <Card className={`transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${isDarkMode ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
              <CardHeader>
                <CardTitle className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  Flow Rate Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className={`text-5xl font-bold transition-all duration-500 ${
                    gpm > 0 
                      ? (isDarkMode ? 'text-blue-400' : 'text-blue-600')
                      : (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                  }`}>
                    {gpm} GPM
                  </div>
                  <Progress 
                    value={Math.min((gpm / 100) * 100, 100)} 
                    className={`h-3 transition-all duration-500 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                  />
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Formula: GPM = (1/seconds) × 3600 × 4.4
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Input Card */}
            <Card className={`transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 ${isDarkMode ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Reading Parameters
                  {Object.keys(validationErrors).length === 0 && operatorName.trim() && (
                    <CheckCircle className="h-5 w-5 ml-2 text-green-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="operatorName" className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Operator Name *
                    {validationErrors.operatorName && <AlertCircle className="h-4 w-4 ml-1 text-red-500" />}
                  </Label>
                  <Input
                    id="operatorName"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    placeholder="Enter operator name"
                    className={`transition-all duration-200 ${getInputValidationStyle('operatorName')}`}
                    required
                  />
                  {validationErrors.operatorName && (
                    <p className="text-red-500 text-sm animate-fade-in">{validationErrors.operatorName}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deepwell9" className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Deepwell 9
                      {validationErrors.deepwell9 && <AlertCircle className="h-4 w-4 ml-1 text-red-500" />}
                    </Label>
                    <Input
                      id="deepwell9"
                      type="number"
                      value={deepwell9}
                      onChange={(e) => setDeepwell9(e.target.value)}
                      placeholder="Enter deepwell 9 value"
                      className={`transition-all duration-200 ${getInputValidationStyle('deepwell9')}`}
                    />
                    {validationErrors.deepwell9 && (
                      <p className="text-red-500 text-sm animate-fade-in">{validationErrors.deepwell9}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deepwell10" className={`flex items-center ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Deepwell 10
                      {validationErrors.deepwell10 && <AlertCircle className="h-4 w-4 ml-1 text-red-500" />}
                    </Label>
                    <Input
                      id="deepwell10"
                      type="number"
                      value={deepwell10}
                      onChange={(e) => setDeepwell10(e.target.value)}
                      placeholder="Enter deepwell 10 value"
                      className={`transition-all duration-200 ${getInputValidationStyle('deepwell10')}`}
                    />
                    {validationErrors.deepwell10 && (
                      <p className="text-red-500 text-sm animate-fade-in">{validationErrors.deepwell10}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes" className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                    Notes (optional)
                  </Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this reading"
                    className={`transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-400' : 'focus:border-blue-400'}`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Data Log Section */}
          <div>
            <Card className={`transition-all duration-300 hover:shadow-xl ${isDarkMode ? 'bg-gray-800/80 border-gray-700 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm shadow-lg'}`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  <CardTitle className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Flow Readings ({flowLog.length})
                    {isLoading && <Loader2 className="h-5 w-5 ml-2 animate-spin" />}
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button 
                      onClick={sendToAdmin} 
                      variant="outline" 
                      size="sm"
                      disabled={isSending || flowLog.length === 0}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Send to Admin
                    </Button>
                    <Button 
                      onClick={exportToCSV} 
                      variant="outline" 
                      size="sm"
                      disabled={isExporting || flowLog.length === 0}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      Export CSV
                    </Button>
                    <Button 
                      onClick={clearAllData} 
                      variant="destructive" 
                      size="sm"
                      disabled={isLoading || flowLog.length === 0}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                  {isLoading && flowLog.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <span className={`ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading readings...</span>
                    </div>
                  ) : flowLog.length === 0 ? (
                    <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="space-y-2">
                        <p className="text-lg">No readings logged yet</p>
                        <p className="text-sm">Start your first measurement above</p>
                      </div>
                    </div>
                  ) : (
                    flowLog.map((reading, index) => (
                      <div
                        key={reading.id}
                        className={`p-4 rounded-lg border transition-all duration-300 transform hover:scale-102 animate-fade-in ${
                          isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:shadow-lg' 
                            : 'bg-white/80 border-gray-200 hover:bg-gray-50 hover:shadow-md'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start space-y-2 sm:space-y-0">
                          <div className="flex-1 space-y-1">
                            <div className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {reading.gpm} GPM - {reading.operatorName}
                            </div>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Duration: {reading.duration}s
                            </div>
                            <div className={`text-sm grid grid-cols-1 sm:grid-cols-2 gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              <span>Deepwell 9: {reading.deepwell9}</span>
                              <span>Deepwell 10: {reading.deepwell10}</span>
                            </div>
                            {reading.notes && (
                              <div className={`text-sm mt-2 p-2 rounded ${isDarkMode ? 'text-gray-300 bg-gray-600/30' : 'text-gray-700 bg-gray-100'}`}>
                                "{reading.notes}"
                              </div>
                            )}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} sm:text-right`}>
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
