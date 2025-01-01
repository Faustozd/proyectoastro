import subprocess
import argparse
import json

class PortCloser:
    def __init__(self, target, open_ports):
        """
        Inicializa el PortCloser con un target y una lista de puertos abiertos
        
        :param target: IP o host a analizar
        :param open_ports: Lista de puertos abiertos
        """
        self.target = target
        self.open_ports = open_ports

    def get_necessary_ports(self):
        """
        Devuelve un conjunto de puertos generalmente considerados necesarios
        
        :return: Conjunto de puertos necesarios
        """
        return {
            22,    # SSH
            80,    # HTTP
            443,   # HTTPS
            3389,  # RDP
            53,    # DNS
            5000,  # Algunos servicios web
            8000,  # Desarrollo web
            8080,  # Servidores alternativos
        }

    def close_unnecessary_ports(self):
        """
        Cierra puertos que no están en la lista de puertos necesarios
        
        :return: Lista de puertos cerrados
        """
        necessary_ports = self.get_necessary_ports()
        ports_to_close = []
        
        for port_str in self.open_ports:
            try:
                # Extraer el número de puerto de la etiqueta
                port_num = int(port_str.split()[-1])
                
                # Si el puerto no está en los necesarios, intentar cerrarlo
                if port_num not in necessary_ports:
                    ports_to_close.append(port_num)
            except (ValueError, IndexError):
                continue

        closed_ports = []
        for port in ports_to_close:
            try:
                # Comando de PowerShell para bloquear el puerto
                command = f'New-NetFirewallRule -DisplayName "Bloqueo de Puerto {port}" -Direction Inbound -LocalPort {port} -Protocol TCP -Action Block'
                subprocess.run(["powershell", "-Command", command], check=True, capture_output=True, text=True)
                closed_ports.append(port)
            except subprocess.CalledProcessError:
                # Si falla el bloqueo, no hacer nada
                pass
        
        return {
            'labels': [f"Puerto {port}" for port in closed_ports],
            'data': [1] * len(closed_ports)
        }

def main():
    # Configurar el parser de argumentos
    parser = argparse.ArgumentParser(description='Herramienta de cierre de puertos')
    parser.add_argument('-t', '--target', default='localhost', help='Dirección IP objetivo')
    parser.add_argument('-p', '--ports', nargs='+', help='Lista de puertos abiertos')
    
    args = parser.parse_args()

    # Si no se proporcionan puertos, salir
    if not args.ports:
        print(json.dumps({'error': 'No se proporcionaron puertos'}))
        return

    # Crear instancia de PortCloser
    closer = PortCloser(args.target, args.ports)
    
    # Cerrar puertos innecesarios
    closed_ports = closer.close_unnecessary_ports()
    
    # Imprimir resultados en JSON
    print(json.dumps({
        'puertosCerrados': closed_ports
    }))

if __name__ == "__main__":
    main()