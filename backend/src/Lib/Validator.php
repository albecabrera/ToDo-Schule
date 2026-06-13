<?php

declare(strict_types=1);

namespace App\Lib;

/**
 * Validator
 * -----------------------------------------------------------------------------
 * Leichtgewichtige, regelbasierte Eingabevalidierung (Ersatz für Joi /
 * express-validator). Wirft bei Fehlern eine 422-HttpException mit Detailliste.
 *
 * Unterstützte Regeln:
 *   required | string | email | int | bool | array | min:N | max:N |
 *   in:a,b,c | date | nullable
 *
 * Beispiel:
 *   $data = Validator::make($input, [
 *       'title'    => 'required|string|max:255',
 *       'priority' => 'nullable|in:low,medium,high',
 *   ]);
 */
final class Validator
{
    public static function make(array $input, array $rules): array
    {
        $errors = [];
        $clean  = [];

        foreach ($rules as $field => $ruleStr) {
            $ruleList = explode('|', $ruleStr);
            $value    = $input[$field] ?? null;
            $nullable = in_array('nullable', $ruleList, true);
            $present  = array_key_exists($field, $input) && $value !== null && $value !== '';

            if (!$present) {
                if (in_array('required', $ruleList, true)) {
                    $errors[$field][] = 'ist erforderlich';
                } elseif ($nullable || !in_array('required', $ruleList, true)) {
                    if (array_key_exists($field, $input)) {
                        $clean[$field] = $value; // explizit übergebenes null/'' beibehalten
                    }
                }
                continue;
            }

            foreach ($ruleList as $rule) {
                [$name, $arg] = array_pad(explode(':', $rule, 2), 2, null);
                switch ($name) {
                    case 'string':
                        if (!is_string($value)) {
                            $errors[$field][] = 'muss Text sein';
                        }
                        break;
                    case 'email':
                        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[$field][] = 'muss eine gültige E-Mail sein';
                        }
                        break;
                    case 'int':
                        if (!is_int($value) && !(is_string($value) && ctype_digit(ltrim($value, '-')))) {
                            $errors[$field][] = 'muss eine ganze Zahl sein';
                        } else {
                            $value = (int) $value;
                        }
                        break;
                    case 'bool':
                        if (!is_bool($value)) {
                            $value = in_array($value, [1, '1', 'true', true], true);
                        }
                        break;
                    case 'array':
                        if (!is_array($value)) {
                            $errors[$field][] = 'muss eine Liste sein';
                        }
                        break;
                    case 'min':
                        $len = is_string($value) ? mb_strlen($value) : (is_numeric($value) ? (float) $value : count((array) $value));
                        if ($len < (float) $arg) {
                            $errors[$field][] = "muss mindestens $arg sein/lang sein";
                        }
                        break;
                    case 'max':
                        $len = is_string($value) ? mb_strlen($value) : (is_numeric($value) ? (float) $value : count((array) $value));
                        if ($len > (float) $arg) {
                            $errors[$field][] = "darf höchstens $arg sein/lang sein";
                        }
                        break;
                    case 'in':
                        $allowed = explode(',', (string) $arg);
                        if (!in_array((string) $value, $allowed, true)) {
                            $errors[$field][] = 'hat einen unzulässigen Wert';
                        }
                        break;
                    case 'date':
                        if (strtotime((string) $value) === false) {
                            $errors[$field][] = 'ist kein gültiges Datum';
                        }
                        break;
                }
            }

            $clean[$field] = $value;
        }

        if ($errors !== []) {
            throw HttpException::unprocessable('Validierung fehlgeschlagen', $errors);
        }

        return $clean;
    }
}
