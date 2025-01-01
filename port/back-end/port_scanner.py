import subprocess
import argparse
import socket
import threading
from queue import Queue
import time
import json

# PortScanner class (Escáner de puertos)
class PortScanner:
    def __init__(self, target, start_port=1, end_port=65535, threads=100):
        self.target = target
        self.start_port = start_port
        self.end_port = end_port
        self.threads = threads
        self.queue = Queue()
        self.open_ports = []

    def port_scan(self, port):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((self.target, port))
            if result == 0:
                self.open_ports.append(port)
            sock.close()
        except:
            pass

    def worker(self):
        while not self.queue.empty():
            port = self.queue.get()
            self.port_scan(port)
            self.queue.task_done()

    def scan(self):
        start_time = time.time()

        # Llenar la cola de puertos
        for port in range(self.start_port, self.end_port + 1):
            self.queue.put(port)

        # Crear y iniciar hilos
        thread_list = []
        for _ in range(self.threads):
            thread = threading.Thread(target=self.worker)
            thread_list.append(thread)

        for thread in thread_list:
            thread.start()

        # Esperar a que todos los hilos terminen
        self.queue.join()

        end_time = time.time()

        # Crear un diccionario con los resultados
        results = {
            'puertosAbiertos': {
                'labels': [f"Puerto {port}" for port in self.open_ports],
                'data': [1] * len(self.open_ports)  # Valor 1 para cada puerto abierto
            },            
            'logs': [f"Escaneando puertos en {self.target}..."] + [f"Puerto {port}: ABIERTO" for port in sorted(self.open_ports)]
        }

        return results

# PortCloser class (Bloqueo de puertos)
class PortCloser:
    def __init__(self, target, open_ports):
        self.target = target
        self.open_ports = open_ports

    def close_port(self, port):
        try:
            command = f'New-NetFirewallRule -DisplayName "Bloqueo de Puerto {port}" -Direction Inbound -LocalPort {port} -Protocol TCP -Action Block'
            subprocess.run(["powershell", "-Command", command], check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            pass  # No imprimimos errores aquí

    def close_ports(self):
        for port in self.open_ports:
            self.close_port(port)

def main():
    # Argument parser
    parser = argparse.ArgumentParser(description='Escáner de puertos y cerrador de puertos')
    parser.add_argument('-t', '--target', default='localhost', help='Dirección IP a escanear y bloquear')
    parser.add_argument('-s', '--start', type=int, default=1, help='Puerto de inicio')
    parser.add_argument('-e', '--end', type=int, default=1000, help='Puerto final')
    
    args = parser.parse_args()

    # Escanear puertos
    scanner = PortScanner(args.target, args.start, args.end)
    open_ports = scanner.scan()

    # Bloquear puertos encontrados
    closer = PortCloser(args.target, open_ports['puertosAbiertos']['labels'])
    closer.close_ports()

    # Devolver los resultados como JSON, sin ningún mensaje antes
    print(json.dumps(open_ports))  # Esto enviará los datos en formato JSON
    

if __name__ == "__main__":
    main()
