<?php

declare(strict_types=1);

namespace App\Routes;

use App\Lib\HttpException;
use App\Lib\Request;
use App\Middleware\AuthMiddleware;
use App\Middleware\RateLimiter;

/**
 * Router
 * -----------------------------------------------------------------------------
 * Minimaler, expliziter Router. Pfad-Parameter mit ":name". Pro Route lassen
 * sich Middleware-Optionen setzen:
 *   ['auth' => true]            -> AuthMiddleware (Bearer-Token nötig)
 *   ['rateLimit' => 'auth']     -> RateLimiter mit Bucket-Namen
 */
final class Router
{
    /** @var array<int,array{method:string,regex:string,vars:string[],handler:array,options:array}> */
    private array $routes = [];

    public function add(string $method, string $pattern, array $handler, array $options = []): void
    {
        // ":id" -> benannte Capture-Gruppe; Pfad wird zu Regex.
        $vars = [];
        $regex = preg_replace_callback('#:([a-zA-Z_]+)#', function ($m) use (&$vars) {
            $vars[] = $m[1];
            return '([^/]+)';
        }, $pattern);
        $regex = '#^' . rtrim($regex, '/') . '$#';

        $this->routes[] = compact('method', 'regex', 'vars', 'handler', 'options') + ['pattern' => $pattern];
    }

    public function get(string $p, array $h, array $o = []): void    { $this->add('GET', $p, $h, $o); }
    public function post(string $p, array $h, array $o = []): void   { $this->add('POST', $p, $h, $o); }
    public function patch(string $p, array $h, array $o = []): void  { $this->add('PATCH', $p, $h, $o); }
    public function delete(string $p, array $h, array $o = []): void { $this->add('DELETE', $p, $h, $o); }

    public function dispatch(Request $req): void
    {
        $path = rtrim($req->path, '/') ?: '/';
        $methodMismatch = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $path, $matches)) {
                continue;
            }
            if ($route['method'] !== $req->method) {
                $methodMismatch = true;
                continue;
            }

            // Pfad-Parameter füllen.
            array_shift($matches);
            foreach ($route['vars'] as $i => $name) {
                $req->params[$name] = $matches[$i] ?? '';
            }

            // Middleware ausführen.
            $opts = $route['options'];
            if (!empty($opts['rateLimit'])) {
                RateLimiter::check('rl:' . $opts['rateLimit']);
            }
            if (!empty($opts['auth'])) {
                AuthMiddleware::handle($req);
            }

            // Controller aufrufen.
            [$class, $action] = $route['handler'];
            $class::$action($req);
            return;
        }

        if ($methodMismatch) {
            throw new HttpException(405, 'Methode nicht erlaubt', 'method_not_allowed');
        }
        throw HttpException::notFound('Endpunkt nicht gefunden', 'route_not_found');
    }
}
