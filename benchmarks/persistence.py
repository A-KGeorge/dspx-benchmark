"""
Story 3 — Redis Resilience (State Persistence)

This benchmark tests state persistence and restoration for signal processing pipelines.

Note: This is a Python implementation demonstrating the persistence pattern.
      Since dspx doesn't have a Python port, this uses scipy.signal for demonstration.

This test does:
1. Control: Process entire signal with pipeline
2. Test:
   - Process first half and save state
   - Create new pipeline and load state
   - Process second half
3. Compare Control and Test outputs
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))

import numpy as np
import json
import pickle
import time
import hashlib
from scipy import signal as sp_signal
from common import (
    INPUT_SIZES,
    genSignal,
    getMachineSpecs,
    runTimed,
    saveJSON,
    ensureDirs,
)

try:
    import redis
    HAS_REDIS = True
except ImportError:
    HAS_REDIS = False
    print("⚠️  redis-py not installed. Install with: pip install redis")
    print("   Will test in-memory state transfer only\n")


def format_bytes(bytes_val):
    """Format bytes for display"""
    if bytes_val >= 1024**3:
        return f"{bytes_val / 1024**3:.2f} GB"
    elif bytes_val >= 1024**2:
        return f"{bytes_val / 1024**2:.2f} MB"
    elif bytes_val >= 1024:
        return f"{bytes_val / 1024:.2f} KB"
    else:
        return f"{bytes_val} B"


class SimplePipeline:
    """
    Simple stateful pipeline demonstrating persistence pattern.
    Uses scipy.signal for actual signal processing.
    """
    
    def __init__(self):
        self.filter_state = None
        self.rms_buffer = None
        self.zscore_buffer = None
        self.config = {
            'filter_order': 51,
            'cutoff': 3000,
            'sample_rate': 10000,
            'rms_window': 100,
            'zscore_window': 20,
        }
        
        # Design FIR filter
        self.fir_coef = sp_signal.firwin(
            self.config['filter_order'],
            self.config['cutoff'],
            fs=self.config['sample_rate'],
            window='hamming'
        )
        
    def process(self, signal_data):
        """Process signal through pipeline"""
        # Apply FIR filter with state
        if self.filter_state is None:
            filtered, self.filter_state = sp_signal.lfilter(
                self.fir_coef, 1, signal_data, zi=np.zeros(len(self.fir_coef) - 1)
            )
        else:
            filtered, self.filter_state = sp_signal.lfilter(
                self.fir_coef, 1, signal_data, zi=self.filter_state
            )
        
        # RMS with moving window
        rms_result = self._moving_rms(filtered, self.config['rms_window'])
        
        # Z-Score Normalization with moving window
        zscore_result = self._moving_zscore(rms_result, self.config['zscore_window'])
        
        # Rectify (full wave)
        rectified = np.abs(zscore_result)
        
        return rectified.astype(np.float32)
    
    def _moving_rms(self, data, window_size):
        """Moving RMS with state"""
        # Initialize buffer if needed
        if self.rms_buffer is None:
            self.rms_buffer = np.zeros(window_size)
        
        result = np.zeros(len(data))
        for i in range(len(data)):
            # Shift buffer and add new sample
            self.rms_buffer = np.roll(self.rms_buffer, -1)
            self.rms_buffer[-1] = data[i]
            
            # Calculate RMS
            result[i] = np.sqrt(np.mean(self.rms_buffer ** 2))
        
        return result
    
    def _moving_zscore(self, data, window_size):
        """Moving Z-Score normalization with state"""
        # Initialize buffer if needed
        if self.zscore_buffer is None:
            self.zscore_buffer = np.zeros(window_size)
        
        result = np.zeros(len(data))
        for i in range(len(data)):
            # Shift buffer and add new sample
            self.zscore_buffer = np.roll(self.zscore_buffer, -1)
            self.zscore_buffer[-1] = data[i]
            
            # Calculate z-score
            mean = np.mean(self.zscore_buffer)
            std = np.std(self.zscore_buffer)
            result[i] = (data[i] - mean) / (std + 1e-8)
        
        return result
    
    def save_state(self, format='json'):
        """Save pipeline state"""
        state = {
            'config': self.config,
            'filter_state': self.filter_state.tolist() if self.filter_state is not None else None,
            'rms_buffer': self.rms_buffer.tolist() if self.rms_buffer is not None else None,
            'zscore_buffer': self.zscore_buffer.tolist() if self.zscore_buffer is not None else None,
        }
        
        if format == 'json':
            return json.dumps(state)
        else:  # pickle format
            # For pickle, we can serialize the numpy arrays directly (more efficient)
            state_pickle = {
                'config': self.config,
                'filter_state': self.filter_state,
                'rms_buffer': self.rms_buffer,
                'zscore_buffer': self.zscore_buffer,
            }
            return pickle.dumps(state_pickle)
    
    def load_state(self, state_data, format='json'):
        """Load pipeline state"""
        if format == 'json':
            state = json.loads(state_data)
            self.config = state['config']
            self.filter_state = np.array(state['filter_state']) if state['filter_state'] is not None else None
            self.rms_buffer = np.array(state['rms_buffer']) if state['rms_buffer'] is not None else None
            self.zscore_buffer = np.array(state['zscore_buffer']) if state['zscore_buffer'] is not None else None
        else:  # pickle format
            state = pickle.loads(state_data)
            self.config = state['config']
            self.filter_state = state['filter_state']
            self.rms_buffer = state['rms_buffer']
            self.zscore_buffer = state['zscore_buffer']


def main():
    ensureDirs()
    
    print("🚀 Story 3 — Redis Resilience (State Persistence)\n")
    
    specs = getMachineSpecs()
    print("Machine Specs:")
    print(f"  CPU: {specs['cpu']}")
    print(f"  Python: {specs['node']}")
    print(f"  dspx: Python (scipy-based demo)\n")
    
    results = []
    
    print("=" * 80)
    print("PIPELINE STATE PERSISTENCE (Python)")
    print("=" * 80)
    print("\nTesting Pipeline: [Filter → RMS → ZScoreNormalize → Rectify]\n")
    
    redis_client = None
    redis_available = False
    
    if HAS_REDIS:
        try:
            redis_client = redis.Redis(
                host='localhost',
                port=6379,
                socket_connect_timeout=2,
                socket_timeout=2
            )
            redis_client.ping()
            redis_available = True
        except Exception as e:
            print("⚠️  Redis not available - testing in-memory state transfer only\n")
            print("   To test with Redis: docker run -d -p 6379:6379 redis\n")
    
    for size in INPUT_SIZES:
        print(f"\n{'=' * 80}")
        print(f"Input: {size['name'].upper()} ({size['length']:,} samples)")
        print("=" * 80)
        
        signal_data = genSignal(size['length'], 50, 10000)
        half_length = len(signal_data) // 2
        first_half = signal_data[:half_length]
        second_half = signal_data[half_length:]
        
        # =====================================================================
        # CONTROL PIPELINE (Gold Standard)
        # =====================================================================
        print("\n📊 Phase 1: Processing full signal with Control Pipeline")
        pipeline_control = SimplePipeline()
        output_control = pipeline_control.process(signal_data)
        
        # =====================================================================
        # TEST PIPELINE (Split processing)
        # =====================================================================
        
        # --- Phase 2: Process first half + save state ---
        print("\n📊 Phase 2: Process first half + save state (Test Pipeline)")
        
        # JSON Pipeline
        json_pipeline1 = SimplePipeline()
        json_output1_test = json_pipeline1.process(first_half)
        
        # Save state for JSON
        json_serialize_time = 0
        json_redis_set_time = 0
        json_redis_get_time = 0
        json_deserialize_time = 0
        json_state_to_load = None
        
        json_state_key = f"dspx:persistence:json:{size['name']}"
        
        if redis_available:
            # Serialize
            t0 = time.perf_counter()
            for _ in range(5):
                json_state_to_load = json_pipeline1.save_state('json')
            json_serialize_time = ((time.perf_counter() - t0) / 5) * 1000
            json_state_size = len(json_state_to_load.encode('utf-8'))
            
            # Redis SET
            t0 = time.perf_counter()
            for _ in range(5):
                redis_client.set(json_state_key, json_state_to_load)
            json_redis_set_time = ((time.perf_counter() - t0) / 5) * 1000
            
            print(f"   ✓ JSON serialized in {json_serialize_time:.3f} ms")
            print(f"   ✓ JSON Redis SET in {json_redis_set_time:.3f} ms")
            print(f"   ✓ JSON state size: {format_bytes(json_state_size)}")
        else:
            # In-memory only
            t0 = time.perf_counter()
            for _ in range(5):
                json_state_to_load = json_pipeline1.save_state('json')
            json_serialize_time = ((time.perf_counter() - t0) / 5) * 1000
            json_state_size = len(json_state_to_load.encode('utf-8'))
            
            print(f"   ✓ JSON state serialized in {json_serialize_time:.3f} ms")
            print(f"   ✓ JSON state size: {format_bytes(json_state_size)}")
        
        # Pickle Pipeline
        pickle_pipeline1 = SimplePipeline()
        pickle_output1_test = pickle_pipeline1.process(first_half)
        
        # Save state for Pickle
        pickle_serialize_time = 0
        pickle_redis_set_time = 0
        pickle_redis_get_time = 0
        pickle_deserialize_time = 0
        pickle_state_to_load = None
        
        pickle_state_key = f"dspx:persistence:pickle:{size['name']}"
        
        if redis_available:
            # Serialize
            t0 = time.perf_counter()
            for _ in range(5):
                pickle_state_to_load = pickle_pipeline1.save_state('pickle')
            pickle_serialize_time = ((time.perf_counter() - t0) / 5) * 1000
            pickle_state_size = len(pickle_state_to_load)
            
            # Redis SET
            t0 = time.perf_counter()
            for _ in range(5):
                redis_client.set(pickle_state_key, pickle_state_to_load)
            pickle_redis_set_time = ((time.perf_counter() - t0) / 5) * 1000
            
            print(f"   ✓ Pickle serialized in {pickle_serialize_time:.3f} ms")
            print(f"   ✓ Pickle Redis SET in {pickle_redis_set_time:.3f} ms")
            print(f"   ✓ Pickle state size: {format_bytes(pickle_state_size)}")
        else:
            # In-memory only
            t0 = time.perf_counter()
            for _ in range(5):
                pickle_state_to_load = pickle_pipeline1.save_state('pickle')
            pickle_serialize_time = ((time.perf_counter() - t0) / 5) * 1000
            pickle_state_size = len(pickle_state_to_load)
            
            print(f"   ✓ Pickle state serialized in {pickle_serialize_time:.3f} ms")
            print(f"   ✓ Pickle state size: {format_bytes(pickle_state_size)}")
        
        # --- Phase 3: Create new pipeline, load state, and process second half ---
        print("\n📊 Phase 3: Create, load, and process second half")
        
        # JSON Pipeline load
        json_pipeline2 = SimplePipeline()
        
        if redis_available:
            # Redis GET
            t0 = time.perf_counter()
            for _ in range(5):
                retrieved_state = redis_client.get(json_state_key)
            json_redis_get_time = ((time.perf_counter() - t0) / 5) * 1000
            
            # Deserialize + load
            t0 = time.perf_counter()
            for _ in range(5):
                json_pipeline2.load_state(retrieved_state.decode('utf-8'), 'json')
            json_deserialize_time = ((time.perf_counter() - t0) / 5) * 1000
            
            print(f"   ✓ JSON Redis GET in {json_redis_get_time:.3f} ms")
            print(f"   ✓ JSON deserialized+loaded in {json_deserialize_time:.3f} ms")
        else:
            # In-memory load
            t0 = time.perf_counter()
            for _ in range(5):
                json_pipeline2.load_state(json_state_to_load, 'json')
            json_deserialize_time = ((time.perf_counter() - t0) / 5) * 1000
            
            print(f"   ✓ JSON state loaded in {json_deserialize_time:.3f} ms")
        
        print("   ✓ JSON pipeline state restored")
        
        # Process second half with JSON
        json_output2_test = json_pipeline2.process(second_half)
        
        # Pickle Pipeline load
        pickle_pipeline2 = SimplePipeline()
        
        if redis_available:
            # Redis GET
            t0 = time.perf_counter()
            for _ in range(5):
                retrieved_pickle_state = redis_client.get(pickle_state_key)
            pickle_redis_get_time = ((time.perf_counter() - t0) / 5) * 1000
            
            # Deserialize + load
            t0 = time.perf_counter()
            for _ in range(5):
                pickle_pipeline2.load_state(retrieved_pickle_state, 'pickle')
            pickle_deserialize_time = ((time.perf_counter() - t0) / 5) * 1000
            
            print(f"   ✓ Pickle Redis GET in {pickle_redis_get_time:.3f} ms")
            print(f"   ✓ Pickle deserialized+loaded in {pickle_deserialize_time:.3f} ms")
        else:
            # In-memory load
            t0 = time.perf_counter()
            for _ in range(5):
                pickle_pipeline2.load_state(pickle_state_to_load, 'pickle')
            pickle_deserialize_time = ((time.perf_counter() - t0) / 5) * 1000
            
            print(f"   ✓ Pickle state loaded in {pickle_deserialize_time:.3f} ms")
        
        # Process second half with Pickle
        pickle_output2_test = pickle_pipeline2.process(second_half)
        
        # --- Verify continuity ---
        print("\n📊 Phase 4: Verify continuity")
        
        # Assemble test outputs
        output_json_test = np.concatenate([json_output1_test, json_output2_test])
        output_pickle_test = np.concatenate([pickle_output1_test, pickle_output2_test])
        
        print(f"   Control output length: {len(output_control)}")
        print(f"   JSON Test output length: {len(output_json_test)}")
        print(f"   Length match: {'✅' if len(output_control) == len(output_json_test) else '❌'}")
        
        # Compute SHA-256 hashes
        hash_control = hashlib.sha256(output_control.tobytes()).hexdigest()
        hash_json = hashlib.sha256(output_json_test.tobytes()).hexdigest()
        hash_pickle = hashlib.sha256(output_pickle_test.tobytes()).hexdigest()
        
        json_seamless = hash_control == hash_json
        pickle_seamless = hash_control == hash_pickle
        
        if json_seamless:
            print("   ✅ JSON SEAMLESS: Outputs match perfectly!")
            print(f"   ✓ SHA-256 hash: {hash_control[:16]}...")
        else:
            print("   ⚠️  JSON Outputs differ")
            print(f"   Control: {hash_control[:16]}...")
            print(f"   Test:    {hash_json[:16]}...")
            
            # Check numerical difference
            max_diff = np.max(np.abs(output_control - output_json_test))
            print(f"   Maximum difference: {max_diff:.3e}")
        
        if pickle_seamless:
            print("   ✅ Pickle SEAMLESS: Outputs match perfectly!")
        else:
            print("   ⚠️  Pickle Outputs differ")
            max_diff = np.max(np.abs(output_control - output_pickle_test))
            print(f"   Maximum difference: {max_diff:.3e}")
        
        # Record results
        data = {
            'test': 'persistence',
            'input': size['name'],
            'samples': size['length'],
            
            # JSON metrics
            'json_serialize_ms': json_serialize_time,
            'json_redis_set_ms': json_redis_set_time if redis_available else None,
            'json_redis_get_ms': json_redis_get_time if redis_available else None,
            'json_deserialize_ms': json_deserialize_time,
            'json_save_ms': json_serialize_time + (json_redis_set_time if redis_available else 0),
            'json_load_ms': (json_redis_get_time if redis_available else 0) + json_deserialize_time,
            'state_size_bytes': json_state_size,
            'JsonSeamless': json_seamless,
            
            # Pickle metrics (stored as 'pickle_*' for compatibility with chart scripts)
            'pickle_serialize_ms': pickle_serialize_time,
            'pickle_redis_set_ms': pickle_redis_set_time if redis_available else None,
            'pickle_redis_get_ms': pickle_redis_get_time if redis_available else None,
            'pickle_deserialize_ms': pickle_deserialize_time,
            'pickle_save_ms': pickle_serialize_time + (pickle_redis_set_time if redis_available else 0),
            'pickle_load_ms': (pickle_redis_get_time if redis_available else 0) + pickle_deserialize_time,
            'pickle_state_size_bytes': pickle_state_size,
            'PickleSeamless': pickle_seamless,
            
            'redis_available': redis_available,
            'meta': specs,
        }
        
        results.append(data)
        
        print("\n📊 Benchmark results for this input:")
        print(f"   JSON - Serialize: {json_serialize_time:.3f}ms")
        if redis_available:
            print(f"   JSON - Redis SET: {json_redis_set_time:.3f}ms")
            print(f"   JSON - Redis GET: {json_redis_get_time:.3f}ms")
        print(f"   JSON - Deserialize: {json_deserialize_time:.3f}ms")
        print(f"   JSON - Total Save: {data['json_save_ms']:.3f}ms")
        print(f"   JSON - Total Load: {data['json_load_ms']:.3f}ms")
        print(f"   JSON - State Size: {format_bytes(json_state_size)}")
        print(f"   JSON - Seamless: {'✅' if json_seamless else '❌'}")
        print()
        print(f"   Pickle - Serialize: {pickle_serialize_time:.3f}ms")
        if redis_available:
            print(f"   Pickle - Redis SET: {pickle_redis_set_time:.3f}ms")
            print(f"   Pickle - Redis GET: {pickle_redis_get_time:.3f}ms")
        print(f"   Pickle - Deserialize: {pickle_deserialize_time:.3f}ms")
        print(f"   Pickle - Total Save: {data['pickle_save_ms']:.3f}ms")
        print(f"   Pickle - Total Load: {data['pickle_load_ms']:.3f}ms")
        print(f"   Pickle - State Size: {format_bytes(pickle_state_size)}")
        print(f"   Pickle - Seamless: {'✅' if pickle_seamless else '❌'}")
    
    saveJSON("persistence-python", results)
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    avg_json_serialize = sum(r['json_serialize_ms'] for r in results) / len(results)
    avg_json_deserialize = sum(r['json_deserialize_ms'] for r in results) / len(results)
    avg_json_save = sum(r['json_save_ms'] for r in results) / len(results)
    avg_json_load = sum(r['json_load_ms'] for r in results) / len(results)
    avg_json_size = sum(r['state_size_bytes'] for r in results) / len(results)
    
    avg_pickle_serialize = sum(r['pickle_serialize_ms'] for r in results) / len(results)
    avg_pickle_deserialize = sum(r['pickle_deserialize_ms'] for r in results) / len(results)
    avg_pickle_save = sum(r['pickle_save_ms'] for r in results) / len(results)
    avg_pickle_load = sum(r['pickle_load_ms'] for r in results) / len(results)
    avg_pickle_size = sum(r['pickle_state_size_bytes'] for r in results) / len(results)
    
    all_seamless = all(r['JsonSeamless'] and r['PickleSeamless'] for r in results)
    
    print(f"\n{'=' * 50}")
    print("JSON Format:")
    print(f"{'=' * 50}")
    print(f"Average serialize time:   {avg_json_serialize:.3f} ms")
    print(f"Average deserialize time: {avg_json_deserialize:.3f} ms")
    if redis_available:
        avg_json_redis_set = sum(r['json_redis_set_ms'] or 0 for r in results) / len(results)
        avg_json_redis_get = sum(r['json_redis_get_ms'] or 0 for r in results) / len(results)
        print(f"Average Redis SET time:   {avg_json_redis_set:.3f} ms")
        print(f"Average Redis GET time:   {avg_json_redis_get:.3f} ms")
    print(f"Average total save time:  {avg_json_save:.3f} ms")
    print(f"Average total load time:  {avg_json_load:.3f} ms")
    print(f"Average state size:       {format_bytes(avg_json_size)}")
    
    print(f"\n{'=' * 50}")
    print("Pickle Format:")
    print(f"{'=' * 50}")
    print(f"Average serialize time:   {avg_pickle_serialize:.3f} ms")
    print(f"Average deserialize time: {avg_pickle_deserialize:.3f} ms")
    if redis_available:
        avg_pickle_redis_set = sum(r['pickle_redis_set_ms'] or 0 for r in results) / len(results)
        avg_pickle_redis_get = sum(r['pickle_redis_get_ms'] or 0 for r in results) / len(results)
        print(f"Average Redis SET time:   {avg_pickle_redis_set:.3f} ms")
        print(f"Average Redis GET time:   {avg_pickle_redis_get:.3f} ms")
    print(f"Average total save time:  {avg_pickle_save:.3f} ms")
    print(f"Average total load time:  {avg_pickle_load:.3f} ms")
    print(f"Average state size:       {format_bytes(avg_pickle_size)}")
    
    print(f"\nAll seamless:             {'✅ YES' if all_seamless else '⚠️  NO'}")
    
    print("\n📊 Results by input size:")
    for r in results:
        print(f"  {r['input']:<10} - Save: {r['json_save_ms']:.2f}ms, "
              f"Load: {r['json_load_ms']:.2f}ms, "
              f"Size: {format_bytes(r['state_size_bytes'])}, "
              f"Seamless: {'✅' if r['JsonSeamless'] else '❌'}")
    
    if redis_available and redis_client:
        redis_client.close()
        print("\n✓ Disconnected from Redis")


if __name__ == "__main__":
    main()
